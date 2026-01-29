export interface Item {
  id: number;
  name: string;
  description: string;
  price: number;
}

export interface HealthResponse {
  status: string;
}

export interface Idea {
  id: number;
  title: string;
  description: string | null;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple';
  position_x: number;
  position_y: number;
  votes: number;
  created_at: string;
}

export interface IdeaCreate {
  title: string;
  description?: string;
  color: string;
  position_x: number;
  position_y: number;
}
