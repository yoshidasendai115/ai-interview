/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["*.ngrok-free.app"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "microphone=(*), camera=(*)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
