export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          website: string;
          instagram_handle: string;
          tone_of_voice: string;
          language_preference: Database["public"]["Enums"]["project_language"];
          plan: string;
          trial_start: string | null;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          website?: string;
          instagram_handle?: string;
          tone_of_voice?: string;
          language_preference?: Database["public"]["Enums"]["project_language"];
          plan?: string;
          trial_start?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          profile_id: string;
          business_type: string | null;
          couple_name: string | null;
          wedding_date: string | null;
          location: string | null;
          style: string;
          special_notes: string;
          desired_tone: string;
          language: Database["public"]["Enums"]["project_language"];
          image_count: number;
          uploaded_image_count: number;
          favorite_count: number;
          tag_count: number;
          internal_notes: string;
          status: Database["public"]["Enums"]["project_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          business_type?: string | null;
          couple_name?: string | null;
          wedding_date?: string | null;
          location?: string | null;
          style?: string;
          special_notes?: string;
          desired_tone?: string;
          language?: Database["public"]["Enums"]["project_language"];
          image_count?: number;
          uploaded_image_count?: number;
          favorite_count?: number;
          tag_count?: number;
          internal_notes?: string;
          status?: Database["public"]["Enums"]["project_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      project_images: {
        Row: {
          id: string;
          project_id: string;
          storage_path: string;
          thumbnail_path: string | null;
          filename: string;
          sort_order: number;
          is_favorite: boolean;
          tags: string[];
          captured_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          storage_path: string;
          thumbnail_path?: string | null;
          filename: string;
          sort_order?: number;
          is_favorite?: boolean;
          tags?: string[];
          captured_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_images"]["Insert"]>;
        Relationships: [];
      };
      project_outputs: {
        Row: {
          id: string;
          project_id: string;
          output_type: Database["public"]["Enums"]["output_type"];
          content_markdown: string;
          content_text: string;
          payload_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          output_type: Database["public"]["Enums"]["output_type"];
          content_markdown?: string;
          content_text?: string;
          payload_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_outputs"]["Insert"]>;
        Relationships: [];
      };
      export_jobs: {
        Row: {
          id: string;
          project_id: string;
          export_type: Database["public"]["Enums"]["export_type"];
          status: Database["public"]["Enums"]["job_status"];
          download_url: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          export_type: Database["public"]["Enums"]["export_type"];
          status?: Database["public"]["Enums"]["job_status"];
          download_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["export_jobs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      start_trial: {
        Args: { pid: string };
        Returns: boolean;
      };
    };
    Enums: {
      project_language: "DE" | "EN";
      project_status: "brief" | "selection" | "sneak-peek" | "copy" | "export";
      output_type:
        | "blog"
        | "instagram_caption"
        | "hashtags"
        | "reel_ideas"
        | "gallery_description"
        | "thank_you_email"
        | "album_story";
      export_type: "markdown" | "txt" | "csv" | "zip";
      job_status: "pending" | "processing" | "completed" | "failed";
    };
    CompositeTypes: Record<string, never>;
  };
};
