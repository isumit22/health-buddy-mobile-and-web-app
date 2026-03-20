import type { Config } from '@react-router/dev/config';

export default {
	appDirectory: './src/app',
	ssr: true,
	prerender: false, // Disable prerendering for serverless deployment on Vercel
} satisfies Config;
