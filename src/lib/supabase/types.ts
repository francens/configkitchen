export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          mime_type: string | null
          owner_id: string
          project_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind?: string
          mime_type?: string | null
          owner_id: string
          project_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          mime_type?: string | null
          owner_id?: string
          project_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "material_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          albedo_path: string | null
          color: string | null
          created_at: string
          folder_id: string | null
          height_cm: number
          id: string
          metalness: number
          name: string
          normal_path: string | null
          notes: string | null
          owner_id: string
          roughness: number
          roughness_path: string | null
          sku: string | null
          supplier: string | null
          width_cm: number
        }
        Insert: {
          albedo_path?: string | null
          color?: string | null
          created_at?: string
          folder_id?: string | null
          height_cm?: number
          id?: string
          metalness?: number
          name: string
          normal_path?: string | null
          notes?: string | null
          owner_id: string
          roughness?: number
          roughness_path?: string | null
          sku?: string | null
          supplier?: string | null
          width_cm?: number
        }
        Update: {
          albedo_path?: string | null
          color?: string | null
          created_at?: string
          folder_id?: string | null
          height_cm?: number
          id?: string
          metalness?: number
          name?: string
          normal_path?: string | null
          notes?: string | null
          owner_id?: string
          roughness?: number
          roughness_path?: string | null
          sku?: string | null
          supplier?: string | null
          width_cm?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "material_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: Json
          created_at: string
          id: string
          project_id: string
          role: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          project_id: string
          role: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          sample_created: boolean
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          sample_created?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          sample_created?: boolean
        }
        Relationships: []
      }
      project_versions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          project_id: string
          scene: Json
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          project_id: string
          scene: Json
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          project_id?: string
          scene?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          scene: Json
          thumbnail_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          scene?: Json
          thumbnail_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          scene?: Json
          thumbnail_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      renders: {
        Row: {
          camera: Json | null
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          image_path: string | null
          mode: string
          owner_id: string
          project_id: string
          prompt: string | null
          status: string
        }
        Insert: {
          camera?: Json | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          image_path?: string | null
          mode: string
          owner_id: string
          project_id: string
          prompt?: string | null
          status?: string
        }
        Update: {
          camera?: Json | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          image_path?: string | null
          mode?: string
          owner_id?: string
          project_id?: string
          prompt?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "renders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
