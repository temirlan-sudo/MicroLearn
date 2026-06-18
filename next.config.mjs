/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Разрешаем HMR при заходе с локальной сети (telephone, LAN-preview)
  allowedDevOrigins: ["192.168.10.6"],
}

export default nextConfig
