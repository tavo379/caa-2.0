export type Lang = "es" | "en";

export type RouteKey =
    | "home"
    | "services"
    | "projects"
    | "about"
    | "contact";

const routes: Record<RouteKey, Record<Lang, string>> = {
    home: { es: "", en: "" },
    services: { es: "servicios", en: "services" },
    projects: { es: "proyectos", en: "projects" },
    about: { es: "nosotros", en: "about" },
    contact: { es: "contacto", en: "contact" },
};

export function getLocalizedPath(lang: Lang, key: RouteKey): string {
    const segment = routes[key][lang];
    return segment ? `/${lang}/${segment}` : `/${lang}`;
}

export function getLocalizedProjectPath(lang: Lang, slug: string): string {
    return `${getLocalizedPath(lang, "projects")}/${slug}`;
}

export function switchLangPath(currentPath: string, targetLang: Lang): string {
    const match = currentPath.match(/^\/(es|en)(\/.*)?$/);
    if (!match) return `/${targetLang}`;

    const fromLang = match[1] as Lang;
    const rest = match[2] ?? "";

    if (fromLang === targetLang) return currentPath;

    const segments = rest.split("/").filter(Boolean);
    if (segments.length === 0) return `/${targetLang}`;

    const [firstSegment, ...tail] = segments;
    const matchedKey = (Object.keys(routes) as RouteKey[]).find(
        (key) => routes[key][fromLang] === firstSegment,
    );

    if (!matchedKey) return `/${targetLang}`;

    const translated = routes[matchedKey][targetLang];
    const tailPath = tail.length ? `/${tail.join("/")}` : "";
    return translated
        ? `/${targetLang}/${translated}${tailPath}`
        : `/${targetLang}${tailPath}`;
}
