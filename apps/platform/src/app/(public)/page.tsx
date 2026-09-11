import { HomeActions } from "@/components/public/home-actions";
import { HomeFunding } from "@/components/public/home-funding";
import { HomeHero } from "@/components/public/home-hero";
import { HomeImpact } from "@/components/public/home-impact";
import { HomeProcess } from "@/components/public/home-process";
import { HomeStories } from "@/components/public/home-stories";
import { HomeSupport } from "@/components/public/home-support";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeActions />
      <HomeFunding />
      <HomeProcess />
      <HomeSupport />
      <HomeImpact />
      <HomeStories />
    </>
  );
}
