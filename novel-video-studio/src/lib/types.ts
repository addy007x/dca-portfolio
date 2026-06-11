export type Chapter = {
  id: string;
  title: string;
  text: string;
  selected: boolean;
};

export type CaptionCue = {
  text: string;
  start: number;
  end: number;
};

export type ProjectSettings = {
  projectName: string;
  aspectRatio: "9:16" | "16:9";
  voice: string;
  voiceTone: string;
  speed: number;
  captionStyle: "story" | "minimal" | "impact";
  captionColor: string;
};
