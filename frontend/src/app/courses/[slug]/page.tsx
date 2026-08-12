import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactWidget } from "@/components/ContactWidget";
import { CourseDetail } from "@/components/course-detail/CourseDetail";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCourseDetailData } from "@/lib/strapi";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const {slug}=await params; const data=await getCourseDetailData(slug); return {title:data?`${data.course.title} | SureMandarin`:'Course | SureMandarin',description:data?.course.summary}; }
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) { const {slug}=await params; const data=await getCourseDetailData(slug); if(!data) notFound(); return <><Header settings={data.global}/><main><CourseDetail data={data}/></main><ContactWidget settings={data.global}/><Footer settings={data.global}/></>; }
