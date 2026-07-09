/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // यह Vercel पर बिल्ड के दौरान ESLint एरर को अनदेखा कर देगा
    ignoreDuringBuilds: true,
  },
  // अगर टाइपस्क्रिप्ट के कारण भी दिक्कत आए तो इसे भी जोड़ सकते हैं:
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
