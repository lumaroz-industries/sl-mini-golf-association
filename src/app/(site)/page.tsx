import { getHomeContent, getPeopleByIds, getPeopleInstagram } from "@/content/repository";
import { Journey } from "@/sections/home/journey/Journey";
import { PeopleSection } from "@/sections/home/PeopleSection";

/**
 * Runs before first paint: enables the cinematic layout only when WebGL2 is
 * available, so the page never flashes between layouts. Without it (or
 * without JavaScript) the same content renders as stacked sections.
 */
const JOURNEY_MODE = `try{if(document.createElement('canvas').getContext('webgl2'))document.documentElement.setAttribute('data-journey','cinematic')}catch(e){}`;

export default async function HomePage() {
  const home = await getHomeContent();
  const [people, instagram] = await Promise.all([getPeopleByIds(home.people.memberIds), getPeopleInstagram()]);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: JOURNEY_MODE }} />
      <Journey hero={home.hero} intro={home.intro} visionMission={home.visionMission} community={home.community} />
      <PeopleSection content={home.people} people={people} instagram={instagram} />
    </>
  );
}
