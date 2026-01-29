export interface Item {
  id: number;
  name: string;
  description: string;
  price: number;
}

export interface HealthResponse {
  status: string;
}

export interface Board {
  id: number;
  name: string;
  description: string | null;
  color: string;
  idea_count: number;
  created_at: string;
  updated_at: string;
}

export interface BoardCreate {
  name: string;
  description?: string;
  color?: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface TagCreate {
  name: string;
  color?: string;
}

export interface Idea {
  id: number;
  title: string;
  description: string | null;
  color: "yellow" | "pink" | "blue" | "green" | "purple";
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  votes: number;
  created_at: string;
  board_id: number | null;
  tags: Tag[];
  group_id: number | null;
}

export interface IdeaCreate {
  title: string;
  description?: string;
  color: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  rotation?: number;
  board_id?: number;
  tag_ids?: number[];
}

export interface AISuggestions {
  suggestions: string[];
}

export interface AISummary {
  summary: string;
  themes: string[];
  top_priority: string | null;
}

export interface AITagSuggestions {
  suggested_tags: string[];
}

export interface IdeaConnection {
  id: number;
  source_id: number;
  target_id: number;
  label: string | null;
  connection_type: "relates_to" | "depends_on" | "contradicts";
  created_at: string;
}

export interface IdeaConnectionCreate {
  source_id: number;
  target_id: number;
  label?: string;
  connection_type?: string;
}

export interface IdeaGroup {
  id: number;
  name: string;
  color: string;
  board_id: number | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_collapsed: boolean;
  created_at: string;
  idea_ids: number[];
}

export interface IdeaGroupCreate {
  name: string;
  color?: string;
  board_id?: number;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  idea_ids?: number[];
}
