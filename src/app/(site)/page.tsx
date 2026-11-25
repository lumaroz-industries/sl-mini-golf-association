import { getHomeContent, getPeopleByIds, getPeopleInstagram, getPeopleStyle, getSiteSettings } from "@/content/repository";
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
  const [people, instagram, site, style] = await Promise.all([getPeopleByIds(home.people.memberIds), getPeopleInstagram(), getSiteSettings(), getPeopleStyle()]);
  const [owner, dev] = await getPeopleByIds([site.credits.ownerId, site.credits.developerId]);
  // Trackside LED boards on the 3D course: mostly the website's designer, a couple for the founder.
  const trackside = [
    { name: dev.name.toUpperCase(), line: "WEBSITE DESIGN & DEVELOPMENT", tail: instagram[dev.id]?.handle.toUpperCase() },
    { name: owner.name.toUpperCase(), line: "FOUNDER & OWNER", tail: instagram[owner.id]?.handle.toUpperCase() },
  ];

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: JOURNEY_MODE }} />
      <Journey hero={home.hero} intro={home.intro} visionMission={home.visionMission} community={home.community} trackside={trackside} />
      <PeopleSection content={home.people} people={people} instagram={instagram} style={style} />
    </>
  );
}
