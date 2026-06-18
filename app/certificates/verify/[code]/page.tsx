import { CertificateVerify } from "@/components/ml/certificates/verify"
import { PageShell } from "@/components/ml/page-shell"

export const metadata = {
  title: "Проверка сертификата · MicroLearn",
}

export default async function CertificateVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return (
    <PageShell>
      <CertificateVerify code={code} />
    </PageShell>
  )
}
