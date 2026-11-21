import { getHomeContent, getPeopleByIds } from "@/content/repository";
import { HeroSection } from "@/sections/home/HeroSection";
import { IntroSection } from "@/sections/home/IntroSection";
import { VisionMissionSection } from "@/sections/home/VisionMissionSection";
import { CommunitySection } from "@/sections/home/CommunitySection";
import { PeopleSection } from "@/sections/home/PeopleSection";

export default async function HomePage() {
  const home = await getHomeContent();
  const people = await getPeopleByIds(home.people.memberIds);

  return (
    <>
      <HeroSection hero={home.hero} />
      <IntroSection intro={home.intro} />
      <VisionMissionSection content={home.visionMission} />
      <CommunitySection content={home.community} />
      <PeopleSection content={home.people} people={people} />
    </>
  );
}
