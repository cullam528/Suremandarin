import Image from "next/image";
import { Quote, Star } from "lucide-react";
import { TestimonialSubmission } from "@/components/TestimonialSubmission";
import type { Locale } from "@/lib/i18n";
import type { TestimonialData } from "@/lib/strapi";

const testimonialPortraits = [
  "/images/testimonials/patty-willis.png",
  "/images/testimonials/daniel-aylmer.png",
  "/images/testimonials/sophie-martin.png",
  "/images/testimonials/kevin-tan.png",
  "/images/testimonials/carla-rodriguez.png",
  "/images/testimonials/lucas-miller.png",
  "/images/testimonials/aisha-rahman.png",
  "/images/testimonials/marco-bianchi.png",
  "/images/testimonials/emily-johnson.png",
  "/images/testimonials/hana-suzuki.jpg",
];

const featuredTestimonials: TestimonialData[] = [
  {
    id: "featured-patty-willis",
    name: "Patty Willis",
    country: "Student",
    quote:
      "Learning a new language can be quite daunting especially if trying to learn Chinese! However, thanks to Pinyin and a fabulous teacher it is quite easy! My teacher uses pictures, pinyin (Chinese phonetic alphabet), repetitive activities and/or games to help you practice. Then, she planned adventures out to practice what you learned! A trip to the market (including how to get there) where you bought food, clothing, etc. or to a restaurant to order a local dish! Within a few short weeks, I was going to the market on my own, asking for amounts, making purchases, riding the subway, and making appointments for hair or nails on the phone. We always looked forward to lessons, we’re very pleased with our ability to communicate and enjoyed all the city had to offer. Although I did not practice as often as I should have, I did use all I could daily and became confident enough to ride in a taxi, order at Starbucks or a restaurant, order a rotisserie chicken from the French Bakery over the phone, buy tickets for a tour, and ride my scooter from Chaoyang Park to the Pearl Market! It was a true accomplishment!",
    rating: 5,
    image: testimonialPortraits[0],
    verified: true,
  },
  {
    id: "featured-daniel-aylmer",
    name: "Daniel Aylmer",
    country: "Student",
    quote:
      "Having lived in China for over 22 years and multiple Chinese teachers, I cannot recommend my teacher as one of the best. Her passion, patience and ability to teach the most challenged of learners, explains why she is so successful.",
    rating: 5,
    image: testimonialPortraits[1],
    verified: true,
  },
];

const placeholderTestimonials: TestimonialData[] = [
  ["Sophie Martin", "France", "The lessons are practical, warm, and easy to fit into my busy week."],
  ["Kevin Tan", "Singapore", "I can now use Chinese naturally in daily conversations and at work."],
  ["Carla Rodriguez", "Mexico", "The cultural activities helped me understand the language in context."],
  ["Lucas Miller", "Germany", "My teacher always knows how to make a difficult topic feel simple."],
  ["Aisha Rahman", "United Kingdom", "The flexible online lessons gave me the confidence to keep learning."],
  ["Marco Bianchi", "Italy", "I finally feel comfortable speaking Chinese when I travel."],
  ["Emily Johnson", "United States", "Every class gives me something useful that I can practice immediately."],
  ["Hana Suzuki", "Japan", "The steady feedback and encouragement have made a real difference."],
].map(([name, country, quote], index) => ({
  id: `placeholder-testimonial-${index}`,
  name,
  country,
  quote,
  rating: 5,
  image: testimonialPortraits[(index + 2) % testimonialPortraits.length],
  verified: true,
}));

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 text-brand-orange" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: rating }).map((_, index) => (
        <Star key={index} size={16} fill="currentColor" />
      ))}
    </div>
  );
}

function Person({ testimonial, large = false }: { testimonial: TestimonialData; large?: boolean }) {
  return (
    <div className={large ? "flex flex-col items-center text-center" : "flex items-center gap-4"}>
      <Image
        src={testimonial.image}
        alt={`${testimonial.name} avatar`}
        width={large ? 128 : 60}
        height={large ? 128 : 60}
        sizes={large ? "128px" : "56px"}
        className={`${large ? "size-28 sm:size-32" : "size-14"} rounded-full object-cover ring-4 ring-blue-50`}
      />
      <div className={large ? "mt-5" : undefined}>
        <strong className={`${large ? "text-xl" : "text-sm"} block font-extrabold text-brand-navy`}>
          {testimonial.name}
        </strong>
        <span className={`${large ? "mt-1 block text-sm" : "text-xs"} text-slate-500`}>{testimonial.country}</span>
      </div>
    </div>
  );
}

export function TheySayContent({
  testimonials,
  title,
  locale = "en",
  showSubmission = false,
}: {
  testimonials: TestimonialData[];
  title: string;
  locale?: Locale;
  showSubmission?: boolean;
}) {
  const featuredNames = new Set(
    featuredTestimonials.map((item) => item.name.trim().toLowerCase()),
  );
  const seenNames = new Set<string>();
  const regularSource = [
    ...testimonials,
    ...placeholderTestimonials,
  ].filter((testimonial) => {
    const normalizedName = testimonial.name.trim().toLowerCase();
    if (featuredNames.has(normalizedName) || seenNames.has(normalizedName)) {
      return false;
    }
    seenNames.add(normalizedName);
    return true;
  });
  const regularTestimonials = regularSource.slice(0, 8).map((testimonial, index) => ({
    ...testimonial,
    // Keep this page's placeholder and Strapi fallback avatars consistent:
    // every visible review uses a single-person portrait, never a course image.
    image: testimonialPortraits[(index + 2) % testimonialPortraits.length],
  }));

  return (
    <div className="sm-theysay-page soft-gradient min-h-screen py-16 sm:py-24">
      <div className="page-shell">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600">
            {locale === "zh"
              ? "来自全球学习者的真实中文学习体验。"
              : "Real Chinese learning stories from students around the world."}
          </p>
        </header>

        <section className="mt-12 space-y-6 sm:mt-16" aria-labelledby="featured-stories">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-brand-line" />
            <h2 id="featured-stories" className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-blue">
              {locale === "zh" ? "重点学员故事" : "Featured student stories"}
            </h2>
            <span className="h-px flex-1 bg-brand-line" />
          </div>
          {featuredTestimonials.map((testimonial) => (
            <article
              key={testimonial.id}
              className="rounded-[2rem] border border-brand-line bg-white p-6 shadow-xl shadow-blue-900/5 sm:p-10"
            >
              <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-12">
                <div className="flex flex-col items-center text-center">
                  <Person testimonial={testimonial} large />
                  <div className="mt-4 flex flex-col items-center">
                    <Stars rating={testimonial.rating} />
                    <span className="mt-2 block text-xs font-bold text-emerald-700">
                      {locale === "zh" ? "已验证学员" : "Verified student"}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <Quote className="absolute -left-1 -top-3 size-10 text-blue-100 sm:-left-3 sm:-top-5 sm:size-14" fill="currentColor" />
                  <blockquote className="relative text-base leading-8 text-slate-600 sm:text-lg sm:leading-9">
                    “{testimonial.quote}”
                  </blockquote>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-16 sm:mt-20" aria-labelledby="all-stories">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">{locale === "zh" ? "更多评价" : "More reviews"}</p>
              <h2 id="all-stories" className="mt-3 text-3xl font-extrabold text-brand-navy sm:text-4xl">
                {locale === "zh" ? "学习者的日常进步" : "Everyday progress from our learners"}
              </h2>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
              {locale === "zh" ? "8 条评价" : "8 student reviews"}
            </span>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {regularTestimonials.map((testimonial) => (
              <article key={testimonial.id} className="rounded-2xl border border-brand-line bg-white p-6 shadow-sm">
                <Person testimonial={testimonial} />
                <blockquote className="mt-5 text-sm leading-7 text-slate-600">“{testimonial.quote}”</blockquote>
                <div className="mt-5 flex items-center justify-between">
                  <Stars rating={testimonial.rating} />
                  {testimonial.verified && <span className="text-[10px] font-bold text-emerald-700">Verified</span>}
                </div>
              </article>
            ))}
          </div>
        </section>

        {showSubmission && <TestimonialSubmission locale={locale} />}
      </div>
    </div>
  );
}
