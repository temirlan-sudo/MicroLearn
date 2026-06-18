import { InfoPage } from "@/components/ml/info-page"

export const metadata = {
  title: "Контакты · MicroLearn",
}

export default function ContactsPage() {
  return (
    <InfoPage
      eyebrow="Колофон · контакты"
      title="Где найти редакцию"
      intro="Контакты нужны для завершённости демо-проекта: комиссия видит, что у платформы есть понятная точка связи, адреса и редакционный контур."
      sections={[
        {
          title: "Почта",
          body: "microlearn@gmail.com — единый адрес для вопросов студентов, преподавателей и модерации.",
        },
        {
          title: "Телефон",
          body: "8 771 580 53 53",
        },
        {
          title: "Астана",
          body: "Проспект Абая, 52. В проекте этот адрес используется как демонстрационный контакт редакции.",
        },
      ]}
    />
  )
}
