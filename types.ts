export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: "GUY" | "GIRL";
  location: string | null;
  is_premium: boolean;
};

export type Post = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
  profiles?: Profile;
};

export type PrivateMedia = {
  id: string;
  user_id: string;
  title: string | null;
  media_url: string;
  media_type: "image" | "video";
  price: number;
};
