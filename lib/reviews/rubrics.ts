export const RUBRICS = {
  BATTING: ['Setup','Head Position','Balance','Backlift','Trigger Movement','Footwork','Bat Path','Contact Position','Timing','Shot Selection','Pace Handling','Spin Handling'],
  FAST_BOWLING: ['Run-up Rhythm','Gather','Back-foot Contact','Front-foot Contact','Alignment','Hip-Shoulder Separation','Bowling Arm','Release Position','Wrist Position','Follow-through','Consistency'],
  SPIN_BOWLING: ['Approach','Load-up','Pivot','Release','Wrist/Finger Position','Revolutions','Flight','Control','Variation','Follow-through'],
  WICKETKEEPING: ['Setup','Balance','Glove Position','Footwork','Head Position','Movement Against Pace','Movement Against Spin','Standing Up','Standing Back','Collection','Take Technique'],
  FIELDING: ['Ready Position','Movement','Ground Fielding','Hands','Throwing Technique','Accuracy','Release Speed','Catching','Positioning','Decision Making'],
  GENERAL: ['Setup','Balance','Movement','Technique','Decision Making','Consistency'],
} as const;
export type Discipline = keyof typeof RUBRICS;
export const MEDALS = ['TECHNICAL_EXCELLENCE','TIMING_EXCELLENCE','OUTSTANDING_CONTROL','ELITE_FOOTWORK','EXCEPTIONAL_PROGRESS','HIGH_POTENTIAL'] as const;
export function categoryKey(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
export function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${Math.floor(seconds % 60).toString().padStart(2,'0')}`; }
