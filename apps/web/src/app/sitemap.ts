import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://sintachat.com",
      lastModified: new Date(),
    },
  ];
}
