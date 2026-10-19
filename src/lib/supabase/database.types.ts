
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "allowed_email_domains": {
                  Row: {
                    "created_at": string,"default_role": Database["public"]['Enums']["user_role"],"domain": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_role"?: Database["public"]['Enums']["user_role"],"domain": string
                  }
                  Update: {
                    "created_at"?: string,"default_role"?: Database["public"]['Enums']["user_role"],"domain"?: string
                  }
                  Relationships: [
                    
                  ]
                },"app_settings": {
                  Row: {
                    "admin_emails": (string)[],"default_ends_on": string,"default_starts_on": string,"id": boolean,"school_year": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_emails"?: (string)[],"default_ends_on"?: string,"default_starts_on"?: string,"id"?: boolean,"school_year"?: string,"updated_at"?: string
                  }
                  Update: {
                    "admin_emails"?: (string)[],"default_ends_on"?: string,"default_starts_on"?: string,"id"?: boolean,"school_year"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "id": number,"name": string,"position": number,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"name": string,"position"?: number,"slug": string
                  }
                  Update: {
                    "id"?: never,"name"?: string,"position"?: number,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"hidden_at": string | null,"id": string,"parent_id": string | null,"post_id": string | null,"project_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"hidden_at"?: string | null,"id"?: string,"parent_id"?: string | null,"post_id"?: string | null,"project_id": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"hidden_at"?: string | null,"id"?: string,"parent_id"?: string | null,"post_id"?: string | null,"project_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"faqs": {
                  Row: {
                    "answer": string,"created_at": string,"id": string,"position": number,"project_id": string,"question": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"created_at"?: string,"id"?: string,"position"?: number,"project_id": string,"question": string
                  }
                  Update: {
                    "answer"?: string,"created_at"?: string,"id"?: string,"position"?: number,"project_id"?: string,"question"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "faqs_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "faqs_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"follows": {
                  Row: {
                    "created_at": string,"project_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"project_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"project_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"milestones": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"description": string,"ends_on": string | null,"id": string,"period_label": string,"position": number,"project_id": string,"starts_on": string | null,"status": Database["public"]['Enums']["milestone_status"],"title": string,"updated_at": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"description"?: string,"ends_on"?: string | null,"id"?: string,"period_label"?: string,"position"?: number,"project_id": string,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["milestone_status"],"title": string,"updated_at"?: string,"weight"?: number
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"description"?: string,"ends_on"?: string | null,"id"?: string,"period_label"?: string,"position"?: number,"project_id"?: string,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["milestone_status"],"title"?: string,"updated_at"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestones_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": string,"images": (string)[],"milestone_id": string | null,"number": number | null,"project_id": string,"published_at": string | null,"status": Database["public"]['Enums']["post_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"images"?: (string)[],"milestone_id"?: string | null,"number"?: number | null,"project_id": string,"published_at"?: string | null,"status"?: Database["public"]['Enums']["post_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"images"?: (string)[],"milestone_id"?: string | null,"number"?: number | null,"project_id"?: string,"published_at"?: string | null,"status"?: Database["public"]['Enums']["post_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"created_at": string,"display_name": string,"id": string,"promo": string | null,"role": Database["public"]['Enums']["user_role"],"suspended_at": string | null,"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name": string,"id": string,"promo"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"suspended_at"?: string | null,"updated_at"?: string,"username": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"promo"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"suspended_at"?: string | null,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"project_invitations": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"invited_by": string | null,"project_id": string,"role": Database["public"]['Enums']["member_role"],"team_title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"invited_by"?: string | null,"project_id": string,"role"?: Database["public"]['Enums']["member_role"],"team_title"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"invited_by"?: string | null,"project_id"?: string,"role"?: Database["public"]['Enums']["member_role"],"team_title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_invitations_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_invitations_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_members": {
                  Row: {
                    "joined_at": string,"position": number,"project_id": string,"role": Database["public"]['Enums']["member_role"],"team_title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"position"?: number,"project_id": string,"role"?: Database["public"]['Enums']["member_role"],"team_title"?: string,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string,"position"?: number,"project_id"?: string,"role"?: Database["public"]['Enums']["member_role"],"team_title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "category_id": number | null,"cover_url": string | null,"created_at": string,"created_by": string | null,"ends_on": string,"fts": unknown,"game_url": string | null,"id": string,"logo_url": string | null,"pitch": string,"platform": Database["public"]['Enums']["platform"],"progress": number,"published_at": string | null,"repo_url": string | null,"slug": string,"starts_on": string,"status": Database["public"]['Enums']["project_status"],"story": string,"title": string,"updated_at": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: number | null,"cover_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string,"fts"?: never,"game_url"?: string | null,"id"?: string,"logo_url"?: string | null,"pitch"?: string,"platform"?: Database["public"]['Enums']["platform"],"progress"?: number,"published_at"?: string | null,"repo_url"?: string | null,"slug": string,"starts_on"?: string,"status"?: Database["public"]['Enums']["project_status"],"story"?: string,"title": string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Update: {
                    "category_id"?: number | null,"cover_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string,"fts"?: never,"game_url"?: string | null,"id"?: string,"logo_url"?: string | null,"pitch"?: string,"platform"?: Database["public"]['Enums']["platform"],"progress"?: number,"published_at"?: string | null,"repo_url"?: string | null,"slug"?: string,"starts_on"?: string,"status"?: Database["public"]['Enums']["project_status"],"story"?: string,"title"?: string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"id": string,"reason": string,"reporter_id": string | null,"resolved_at": string | null,"resolved_by": string | null,"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"reason": string,"reporter_id"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"reason"?: string,"reporter_id"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"target_id"?: string,"target_type"?: Database["public"]['Enums']["report_target"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "project_cards": {
                  Row: {
                    "category_id": number | null,"category_name": string | null,"category_slug": string | null,"comments_count": number | null,"cover_url": string | null,"created_at": string | null,"ends_on": string | null,"followers_count": number | null,"fts": unknown,"id": string | null,"last_post_at": string | null,"logo_url": string | null,"members_count": number | null,"pitch": string | null,"platform": Database["public"]['Enums']["platform"] | null,"posts_count": number | null,"progress": number | null,"published_at": string | null,"slug": string | null,"starts_on": string | null,"status": Database["public"]['Enums']["project_status"] | null,"title": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "projects_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_invitation": string }; Returns: string
                           },
"can_edit_project":
{ Args: { "p_project": string }; Returns: boolean
                           },
"can_edit_project_path":
{ Args: { "p_folder": string }; Returns: boolean
                           },
"can_view_project":
{ Args: { "p_project": string }; Returns: boolean
                           },
"compute_progress":
{ Args: { "p_project": string }; Returns: number
                           },
"current_role_name":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"default_project_ends_on":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"default_project_starts_on":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"email_domain":
{ Args: { "p_email": string }; Returns: string
                           },
"hook_before_user_created":
{ Args: { "event": Json }; Returns: Json
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_allowed_email":
{ Args: { "p_email": string }; Returns: boolean
                           },
"is_member":
{ Args: { "p_project": string }; Returns: boolean
                           },
"is_owner":
{ Args: { "p_project": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"my_email":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"project_is_public":
{ Args: { "p_project": string }; Returns: boolean
                           }
          }
          Enums: {
            "member_role": "owner"|"dev"|"crea","milestone_status": "todo"|"in_progress"|"done","platform": "borne"|"cocktail"|"tv"|"web","post_status": "draft"|"published","project_status": "draft"|"published"|"hidden","report_target": "project"|"post"|"comment","user_role": "student"|"teacher"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "member_role": ["owner", "dev", "crea"],"milestone_status": ["todo", "in_progress", "done"],"platform": ["borne", "cocktail", "tv", "web"],"post_status": ["draft", "published"],"project_status": ["draft", "published", "hidden"],"report_target": ["project", "post", "comment"],"user_role": ["student", "teacher", "admin"]
          }
        }
} as const
