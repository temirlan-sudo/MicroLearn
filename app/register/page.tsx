import { PageShell } from "@/components/ml/page-shell"
import { RegisterForm } from "@/components/ml/register-form"

export const metadata = {
  title: "Регистрация — MicroLearn",
  description: "Создайте аккаунт: студент, преподаватель или слушатель.",
}

export default function RegisterPage() {
  return (
    <PageShell section="Регистрация · Тараз — Астана">
      <RegisterForm />
    </PageShell>
  )
}
