import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Send, Sparkles, Heart, Mic, Square } from "lucide-react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from "expo-audio";

export default function Index() {
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi there! I'm Health Buddy, your supportive companion. How are you feeling today? 💙",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollViewRef = useRef(null);

  // Create conversation and request permissions on mount
  useEffect(() => {
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Microphone access is needed for voice messages",
        );
      }
    })();
    createConversation();
  }, []);

  const createConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Chat Session" }),
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.id);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleRecord = async () => {
    if (recorderState.isRecording) {
      // Stop recording and process
      await recorder.stop();
      setIsRecording(false);
      await processVoiceMessage();
    } else {
      // Start recording
      try {
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
      } catch (error) {
        console.error("Failed to start recording:", error);
        Alert.alert("Error", "Failed to start recording");
      }
    }
  };

  const processVoiceMessage = async () => {
    setIsTranscribing(true);

    try {
      const audioUri = recorder.uri;

      // Simple transcription simulation (replace with actual transcription API)
      // For demo purposes, we'll use a placeholder
      const placeholderText = "This is a transcribed voice message";

      // Analyze mood and anxiety
      const analysisResponse = await fetch("/api/analyze-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: audioUri,
          text: placeholderText,
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error("Analysis failed");
      }

      const analysis = await analysisResponse.json();

      // Create user message with voice metadata
      const userMessage = {
        role: "user",
        content: analysis.transcribed_text || placeholderText,
        isVoice: true,
        mood: analysis.mood,
        anxietyLevel: analysis.anxiety_level,
        detectedEmotions: analysis.detected_emotions,
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      // Send to chat API
      await sendMessageToAI(newMessages, analysis);
    } catch (error) {
      console.error("Voice processing error:", error);
      Alert.alert(
        "Error",
        "Failed to process voice message. Please try again.",
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const sendMessageToAI = async (newMessages, analysis = null) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId,
          voiceAnalysis: analysis,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.message,
        },
      ]);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: inputText.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");

    await sendMessageToAI(newMessages);
  }, [inputText, messages, isLoading, conversationId]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingHorizontal: 20,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E2E8F0",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#E0F2FE",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Heart size={24} color="#0EA5E9" fill="#0EA5E9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "600", color: "#1E293B" }}>
              Health Buddy
            </Text>
            <Text style={{ fontSize: 14, color: "#64748B", marginTop: 2 }}>
              Your supportive companion
            </Text>
          </View>
          <Sparkles size={24} color="#0EA5E9" />
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {(isLoading || isTranscribing) && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 20,
                borderBottomLeftRadius: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <ActivityIndicator size="small" color="#0EA5E9" />
              <Text style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>
                {isTranscribing ? "Processing voice..." : "Thinking..."}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Recording Indicator */}
      {isRecording && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#FEF3C7",
            borderTopWidth: 1,
            borderTopColor: "#FDE68A",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#EF4444",
              }}
            />
            <Text style={{ fontSize: 14, color: "#92400E", fontWeight: "500" }}>
              Recording... {formatDuration(recorderState.currentTime)}
            </Text>
          </View>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E2E8F0",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 12,
            }}
          >
            {/* Voice Button */}
            <TouchableOpacity
              onPress={handleRecord}
              disabled={isLoading || isTranscribing}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isRecording ? "#EF4444" : "#8B5CF6",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: isRecording ? "#EF4444" : "#8B5CF6",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {isRecording ? (
                <Square size={20} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Mic size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <View
              style={{
                flex: 1,
                backgroundColor: "#F8FAFC",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                paddingHorizontal: 16,
                paddingVertical: 8,
                maxHeight: 120,
              }}
            >
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Share what's on your mind..."
                placeholderTextColor="#94A3B8"
                multiline
                editable={!isRecording}
                style={{
                  fontSize: 16,
                  color: "#1E293B",
                  minHeight: 40,
                  maxHeight: 100,
                  paddingTop: 8,
                }}
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading || isRecording}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  inputText.trim() && !isLoading && !isRecording
                    ? "#0EA5E9"
                    : "#CBD5E1",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity:
                  inputText.trim() && !isLoading && !isRecording ? 0.3 : 0,
                shadowRadius: 4,
                elevation:
                  inputText.trim() && !isLoading && !isRecording ? 3 : 0,
              }}
            >
              <Send size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const getMoodColor = (mood) => {
    const colors = {
      happy: "#10B981",
      sad: "#3B82F6",
      anxious: "#F59E0B",
      angry: "#EF4444",
      stressed: "#F97316",
      calm: "#06B6D4",
      excited: "#8B5CF6",
      neutral: "#6B7280",
    };
    return colors[mood] || "#6B7280";
  };

  const getAnxietyColor = (level) => {
    if (level <= 3) return "#10B981"; // Green - low
    if (level <= 6) return "#F59E0B"; // Orange - medium
    return "#EF4444"; // Red - high
  };

  return (
    <Animated.View
      style={{
        flexDirection: "row",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        opacity: fadeAnim,
      }}
    >
      <View style={{ maxWidth: "80%" }}>
        <View
          style={{
            backgroundColor: isUser ? "#0EA5E9" : "#FFFFFF",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 20,
            borderBottomRightRadius: isUser ? 4 : 20,
            borderBottomLeftRadius: isUser ? 20 : 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          {message.isVoice && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Mic size={14} color={isUser ? "#FFFFFF" : "#8B5CF6"} />
              <Text
                style={{
                  fontSize: 12,
                  color: isUser ? "#E0F2FE" : "#8B5CF6",
                  fontWeight: "500",
                }}
              >
                Voice Message
              </Text>
            </View>
          )}

          <Text
            style={{
              fontSize: 16,
              color: isUser ? "#FFFFFF" : "#1E293B",
              lineHeight: 22,
            }}
          >
            {message.content}
          </Text>
        </View>

        {/* Mood & Anxiety Indicators */}
        {message.isVoice && message.mood && (
          <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {/* Mood Badge */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: getMoodColor(message.mood),
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 1,
                  elevation: 1,
                }}
              >
                <Text
                  style={{ fontSize: 11, color: "#64748B", fontWeight: "500" }}
                >
                  Mood:
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: getMoodColor(message.mood),
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}
                >
                  {message.mood}
                </Text>
              </View>

              {/* Anxiety Level Badge */}
              {message.anxietyLevel !== undefined && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "#FFFFFF",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    borderLeftWidth: 3,
                    borderLeftColor: getAnxietyColor(message.anxietyLevel),
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 1,
                    elevation: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                      fontWeight: "500",
                    }}
                  >
                    Anxiety:
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: getAnxietyColor(message.anxietyLevel),
                      fontWeight: "600",
                    }}
                  >
                    {message.anxietyLevel}/10
                  </Text>
                </View>
              )}
            </View>

            {/* Detected Emotions */}
            {message.detectedEmotions &&
              message.detectedEmotions.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 4,
                    marginTop: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {message.detectedEmotions.map((emotion, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: "#F1F5F9",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#475569",
                          textTransform: "capitalize",
                        }}
                      >
                        {emotion}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}
