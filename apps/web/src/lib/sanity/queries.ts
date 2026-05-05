import groq from "groq";
import { sanityClient } from "sanity:client";
import type { Lang } from "../i18n/paths";

export type ProjectCard = {
    _id: string;
    title: string;
    slug: string;
    imageUrl: string | null;
    tech: string[] | null;
};

export type ProjectDetail = {
    title: string;
    excerpt: string | null;
    body: unknown;
    cover: {
        asset: { url: string } | null;
        alt: string | null;
    } | null;
    tech: string[] | null;
    links: {
        siteUrl?: string | null;
        repoUrl?: string | null;
    } | null;
    publishedAt: string | null;
};

const projectCardProjection = groq`{
    _id,
    title,
    "slug": slug.current,
    "imageUrl": cover.asset->url,
    "tech": tech[]
}`;

const projectDetailProjection = groq`{
    title,
    excerpt,
    body,
    cover{ asset->{url}, alt },
    tech,
    links,
    publishedAt
}`;

export function fetchProjectsPreview(lang: Lang, limit = 3): Promise<ProjectCard[]> {
    return sanityClient.fetch(
        groq`*[_type == "project" && language == $lang] | order(publishedAt desc)[0...$limit] ${projectCardProjection}`,
        { lang, limit },
    );
}

export function fetchAllProjects(lang: Lang): Promise<ProjectCard[]> {
    return sanityClient.fetch(
        groq`*[_type == "project" && language == $lang] | order(publishedAt desc) ${projectCardProjection}`,
        { lang },
    );
}

export function fetchProjectSlugs(lang: Lang): Promise<{ slug: string }[]> {
    return sanityClient.fetch(
        groq`*[_type == "project" && language == $lang]{ "slug": slug.current }`,
        { lang },
    );
}

export function fetchProjectBySlug(lang: Lang, slug: string): Promise<ProjectDetail | null> {
    return sanityClient.fetch(
        groq`*[_type == "project" && language == $lang && slug.current == $slug][0] ${projectDetailProjection}`,
        { lang, slug },
    );
}
