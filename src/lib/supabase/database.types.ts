
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
            "agent_audit": {
                  Row: {
                    "client_name": string | null,"client_version": string | null,"connection_id": string,"created_at": string,"error": string | null,"id": number,"ok": boolean,"tool": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_name"?: string | null,"client_version"?: string | null,"connection_id": string,"created_at"?: string,"error"?: string | null,"id"?: never,"ok": boolean,"tool": string,"user_id": string
                  }
                  Update: {
                    "client_name"?: string | null,"client_version"?: string | null,"connection_id"?: string,"created_at"?: string,"error"?: string | null,"id"?: never,"ok"?: boolean,"tool"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_audit_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "agent_connections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agent_audit_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agent_clients": {
                  Row: {
                    "blocked_at": string | null,"client_id": string,"created_at": string,"id": string,"kind": string,"logo_url": string | null,"metadata_fetched_at": string | null,"name": string,"redirect_uris": (string)[],"secret_hash": string | null,"token_endpoint_auth_method": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_at"?: string | null,"client_id": string,"created_at"?: string,"id"?: string,"kind": string,"logo_url"?: string | null,"metadata_fetched_at"?: string | null,"name": string,"redirect_uris": (string)[],"secret_hash"?: string | null,"token_endpoint_auth_method"?: string,"verified"?: boolean
                  }
                  Update: {
                    "blocked_at"?: string | null,"client_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"logo_url"?: string | null,"metadata_fetched_at"?: string | null,"name"?: string,"redirect_uris"?: (string)[],"secret_hash"?: string | null,"token_endpoint_auth_method"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"agent_codes": {
                  Row: {
                    "client_id": string,"code_challenge": string,"connection_id": string | null,"created_at": string,"expires_at": string,"expires_on": string,"hash": string,"redirect_uri": string,"resource": string,"scopes": (string)[],"used_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"code_challenge": string,"connection_id"?: string | null,"created_at"?: string,"expires_at": string,"expires_on": string,"hash": string,"redirect_uri": string,"resource": string,"scopes": (string)[],"used_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "client_id"?: string,"code_challenge"?: string,"connection_id"?: string | null,"created_at"?: string,"expires_at"?: string,"expires_on"?: string,"hash"?: string,"redirect_uri"?: string,"resource"?: string,"scopes"?: (string)[],"used_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_codes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "agent_clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agent_codes_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "agent_connections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agent_codes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agent_confirmations": {
                  Row: {
                    "connection_id": string,"created_at": string,"expires_at": string,"hash": string,"payload_hash": string,"summary": string,"tool": string,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "connection_id": string,"created_at"?: string,"expires_at": string,"hash": string,"payload_hash": string,"summary": string,"tool": string,"used_at"?: string | null
                  }
                  Update: {
                    "connection_id"?: string,"created_at"?: string,"expires_at"?: string,"hash"?: string,"payload_hash"?: string,"summary"?: string,"tool"?: string,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_confirmations_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "agent_connections"
      referencedColumns: ["id"]
    }
                  ]
                },"agent_connections": {
                  Row: {
                    "client_id": string | null,"created_at": string,"expires_at": string,"id": string,"key_prefix": string | null,"kind": string,"last_used_at": string | null,"name": string,"revoked_at": string | null,"scopes": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"expires_at": string,"id"?: string,"key_prefix"?: string | null,"kind": string,"last_used_at"?: string | null,"name": string,"revoked_at"?: string | null,"scopes": (string)[],"user_id": string
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"key_prefix"?: string | null,"kind"?: string,"last_used_at"?: string | null,"name"?: string,"revoked_at"?: string | null,"scopes"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_connections_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "agent_clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agent_connections_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agent_tokens": {
                  Row: {
                    "connection_id": string,"created_at": string,"expires_at": string,"hash": string,"kind": string,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "connection_id": string,"created_at"?: string,"expires_at": string,"hash": string,"kind": string,"used_at"?: string | null
                  }
                  Update: {
                    "connection_id"?: string,"created_at"?: string,"expires_at"?: string,"hash"?: string,"kind"?: string,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_tokens_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "agent_connections"
      referencedColumns: ["id"]
    }
                  ]
                },"allowed_email_domains": {
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
                    "admin_emails": (string)[],"agent_disabled_scopes": (string)[],"agent_max_days": number,"agents_enabled": boolean,"default_ends_on": string,"default_starts_on": string,"funding_comments_enabled": boolean,"funding_goal": number,"id": boolean,"max_projects_per_student": number | null,"school_year": string,"teacher_annual_budget": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_emails"?: (string)[],"agent_disabled_scopes"?: (string)[],"agent_max_days"?: number,"agents_enabled"?: boolean,"default_ends_on"?: string,"default_starts_on"?: string,"funding_comments_enabled"?: boolean,"funding_goal"?: number,"id"?: boolean,"max_projects_per_student"?: number | null,"school_year"?: string,"teacher_annual_budget"?: number,"updated_at"?: string
                  }
                  Update: {
                    "admin_emails"?: (string)[],"agent_disabled_scopes"?: (string)[],"agent_max_days"?: number,"agents_enabled"?: boolean,"default_ends_on"?: string,"default_starts_on"?: string,"funding_comments_enabled"?: boolean,"funding_goal"?: number,"id"?: boolean,"max_projects_per_student"?: number | null,"school_year"?: string,"teacher_annual_budget"?: number,"updated_at"?: string
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
                },"characters": {
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
                    "author_id": string,"body": string,"created_at": string,"hidden_at": string | null,"id": string,"investment_id": string | null,"parent_id": string | null,"post_id": string | null,"project_id": string,"updated_at": string,"via_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"hidden_at"?: string | null,"id"?: string,"investment_id"?: string | null,"parent_id"?: string | null,"post_id"?: string | null,"project_id": string,"updated_at"?: string,"via_agent"?: string | null
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"hidden_at"?: string | null,"id"?: string,"investment_id"?: string | null,"parent_id"?: string | null,"post_id"?: string | null,"project_id"?: string,"updated_at"?: string,"via_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_investment_id_fkey"
      columns: ["investment_id"]
isOneToOne: false
      referencedRelation: "investments"
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
                },"emotions": {
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
                },"investments": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"investor_id": string,"project_id": string,"school_year": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"investor_id": string,"project_id": string,"school_year": string,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"investor_id"?: string,"project_id"?: string,"school_year"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "investments_investor_id_fkey"
      columns: ["investor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "investments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "investments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
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
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"agent_connection_id": string | null,"agent_name": string | null,"comment_id": string | null,"created_at": string,"id": string,"invitation_id": string | null,"kind": string,"project_id": string | null,"project_title": string | null,"read_at": string | null,"team_title": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"agent_connection_id"?: string | null,"agent_name"?: string | null,"comment_id"?: string | null,"created_at"?: string,"id"?: string,"invitation_id"?: string | null,"kind": string,"project_id"?: string | null,"project_title"?: string | null,"read_at"?: string | null,"team_title"?: string | null,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"agent_connection_id"?: string | null,"agent_name"?: string | null,"comment_id"?: string | null,"created_at"?: string,"id"?: string,"invitation_id"?: string | null,"kind"?: string,"project_id"?: string | null,"project_title"?: string | null,"read_at"?: string | null,"team_title"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_agent_connection_id_fkey"
      columns: ["agent_connection_id"]
isOneToOne: false
      referencedRelation: "agent_connections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_invitation_id_fkey"
      columns: ["invitation_id"]
isOneToOne: false
      referencedRelation: "project_invitations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": string,"images": (string)[],"milestone_id": string | null,"number": number | null,"project_id": string,"published_at": string | null,"status": Database["public"]['Enums']["post_status"],"title": string,"updated_at": string,"via_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"images"?: (string)[],"milestone_id"?: string | null,"number"?: number | null,"project_id": string,"published_at"?: string | null,"status"?: Database["public"]['Enums']["post_status"],"title": string,"updated_at"?: string,"via_agent"?: string | null
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"images"?: (string)[],"milestone_id"?: string | null,"number"?: number | null,"project_id"?: string,"published_at"?: string | null,"status"?: Database["public"]['Enums']["post_status"],"title"?: string,"updated_at"?: string,"via_agent"?: string | null
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
                },"project_slug_history": {
                  Row: {
                    "changed_at": string,"project_id": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"project_id": string,"slug": string
                  }
                  Update: {
                    "changed_at"?: string,"project_id"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_slug_history_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_slug_history_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "category_id": number | null,"character_id": number | null,"cover_url": string | null,"created_at": string,"created_by": string | null,"emotion_id": number | null,"ends_on": string,"fts": unknown,"game_url": string | null,"id": string,"logo_url": string | null,"pitch": string,"platform": Database["public"]['Enums']["platform"] | null,"progress": number,"published_at": string | null,"repo_url": string | null,"site_url": string | null,"slug": string,"starts_on": string,"status": Database["public"]['Enums']["project_status"],"story": string,"title": string,"updated_at": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: number | null,"character_id"?: number | null,"cover_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"emotion_id"?: number | null,"ends_on"?: string,"fts"?: never,"game_url"?: string | null,"id"?: string,"logo_url"?: string | null,"pitch"?: string,"platform"?: Database["public"]['Enums']["platform"] | null,"progress"?: number,"published_at"?: string | null,"repo_url"?: string | null,"site_url"?: string | null,"slug": string,"starts_on"?: string,"status"?: Database["public"]['Enums']["project_status"],"story"?: string,"title": string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Update: {
                    "category_id"?: number | null,"character_id"?: number | null,"cover_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"emotion_id"?: number | null,"ends_on"?: string,"fts"?: never,"game_url"?: string | null,"id"?: string,"logo_url"?: string | null,"pitch"?: string,"platform"?: Database["public"]['Enums']["platform"] | null,"progress"?: number,"published_at"?: string | null,"repo_url"?: string | null,"site_url"?: string | null,"slug"?: string,"starts_on"?: string,"status"?: Database["public"]['Enums']["project_status"],"story"?: string,"title"?: string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_character_id_fkey"
      columns: ["character_id"]
isOneToOne: false
      referencedRelation: "characters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_emotion_id_fkey"
      columns: ["emotion_id"]
isOneToOne: false
      referencedRelation: "emotions"
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
                    "backers_count": number | null,"category_id": number | null,"category_name": string | null,"category_slug": string | null,"character_id": number | null,"character_name": string | null,"character_slug": string | null,"comments_count": number | null,"cover_url": string | null,"created_at": string | null,"emotion_id": number | null,"emotion_name": string | null,"emotion_slug": string | null,"ends_on": string | null,"followers_count": number | null,"fts": unknown,"funded_amount": number | null,"id": string | null,"last_post_at": string | null,"logo_url": string | null,"members_count": number | null,"pitch": string | null,"platform": Database["public"]['Enums']["platform"] | null,"posts_count": number | null,"progress": number | null,"published_at": string | null,"slug": string | null,"starts_on": string | null,"status": Database["public"]['Enums']["project_status"] | null,"title": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "projects_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_character_id_fkey"
      columns: ["character_id"]
isOneToOne: false
      referencedRelation: "characters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_emotion_id_fkey"
      columns: ["emotion_id"]
isOneToOne: false
      referencedRelation: "emotions"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_invitation": string }; Returns: string
                           },
"admin_agent_clients":
{ Args: Record<PropertyKey, never>; Returns: {
              "blocked_at": string,"client_id": string,"created_at": string,"id": string,"kind": string,"logo_url": string,"name": string,"redirect_uris": (string)[],"users_count": number,"verified": boolean
            }[]
                           },
"admin_agent_connections":
{ Args: Record<PropertyKey, never>; Returns: {
              "actions_count": number,"client_name": string,"client_verified": boolean,"created_at": string,"expires_at": string,"id": string,"kind": string,"last_used_at": string,"name": string,"revoked_at": string,"scopes": (string)[],"user_id": string,"user_name": string,"user_role": Database["public"]['Enums']["user_role"]
            }[]
                           },
"admin_agent_recent_audit":
{ Args: Record<PropertyKey, never>; Returns: {
              "client_name": string,"created_at": string,"error": string,"ok": boolean,"tool": string,"user_name": string
            }[]
                           },
"admin_bootstrap_emails":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"admin_set_agent_client":
{ Args: { "p_blocked": boolean,"p_client": string,"p_verified": boolean }; Returns: undefined
                           },
"agent_allowed_scopes":
{ Args: { "p_role": Database["public"]['Enums']["user_role"] }; Returns: (string)[]
                           },
"agent_expiry_cap":
{ Args: { "p_scopes": (string)[] }; Returns: string
                           },
"agent_expiry_reminders":
{ Args: Record<PropertyKey, never>; Returns: undefined
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
"create_agent_api_key":
{ Args: { "p_expires_at": string,"p_key_hash": string,"p_key_prefix": string,"p_name": string,"p_scopes": (string)[] }; Returns: string
                           },
"current_role_name":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"current_school_year":
{ Args: Record<PropertyKey, never>; Returns: string
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
"is_invited":
{ Args: { "p_project": string }; Returns: boolean
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
"mark_notifications_read":
{ Args: { "p_id"?: string }; Returns: undefined
                           },
"my_agent_audit":
{ Args: { "p_connection": string }; Returns: {
              "client_name": string,"created_at": string,"error": string,"ok": boolean,"tool": string
            }[]
                           },
"my_agent_connections":
{ Args: Record<PropertyKey, never>; Returns: {
              "actions_count": number,"client_logo": string,"client_name": string,"client_verified": boolean,"created_at": string,"expires_at": string,"id": string,"key_prefix": string,"kind": string,"last_used_at": string,"max_expires_at": string,"name": string,"revoked_at": string,"scopes": (string)[]
            }[]
                           },
"my_email":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"normalize_title":
{ Args: { "p_title": string }; Returns: string
                           },
"project_is_fundable":
{ Args: { "p_project": string }; Returns: boolean
                           },
"project_is_public":
{ Args: { "p_project": string }; Returns: boolean
                           },
"revoke_agent_connection":
{ Args: { "p_connection": string }; Returns: undefined
                           },
"revoke_all_agent_connections":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"school_year_of":
{ Args: { "p_date": string }; Returns: string
                           },
"set_agent_connection_expiry":
{ Args: { "p_connection": string,"p_expires_at": string }; Returns: string
                           },
"set_project_constraints":
{ Args: { "p_category": number,"p_character": number,"p_emotion": number,"p_platform": Database["public"]['Enums']["platform"],"p_project": string }; Returns: undefined
                           },
"title_conflicts":
{ Args: { "p_exclude"?: string,"p_title": string }; Returns: {
              "is_published": boolean,"slug": string,"title": string
            }[]
                           },
"transfer_ownership":
{ Args: { "p_my_role"?: Database["public"]['Enums']["member_role"],"p_new_owner": string,"p_project": string }; Returns: undefined
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
