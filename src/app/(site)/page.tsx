import { getHomeContent, getPeopleByIds, getPeopleInstagram, getPeopleStyle, getSiteSettings } from "@/content/repository";
import { Journey } from "@/sections/home/journey/Journey";
import { PeopleSection } from "@/sections/home/PeopleSection";
import { BallHero } from "@/sections/home/ball/BallHero";

/**
 * Which homepage experience runs:
 *  - "ball":   a golf ball falls, dissolves into particles that form the SL
 *              logo; then the people, then the story as plain sections.
 *  - "course": the original 3D golf-course scroll journey.
 * Switch back to "course" to restore the golf course exactly as it was
 * (also saved on the branch backup/golf-course-v1).
 */
const HOME_EXPERIENCE: "ball" | "course" = "ball";

/**
 * Runs before first paint: enables the cinematic layout only when WebGL2 is
 * available, so the page never flashes between layouts. Without it (or
 * without JavaScript) the same content renders as stacked sections.
 */
const JOURNEY_MODE = `try{if(document.createElement('canvas').getContext('webgl2'))document.documentElement.setAttribute('data-journey','cinematic')}catch(e){}`;

export default async function HomePage() {
  const home = await getHomeContent();
  const [people, instagram, site, style] = await Promise.all([getPeopleByIds(home.people.memberIds), getPeopleInstagram(), getSiteSettings(), getPeopleStyle()]);
  const peopleSection = <PeopleSection content={home.people} people={people} instagram={instagram} style={style} />;

  if (HOME_EXPERIENCE === "ball") {
    return (
      <>
        <BallHero hero={home.hero} />
        {peopleSection}
        <Journey variant="story" hero={home.hero} intro={home.intro} visionMission={home.visionMission} community={home.community} />
      </>
    );
  }

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
      {peopleSection}
    </>
  );
}
