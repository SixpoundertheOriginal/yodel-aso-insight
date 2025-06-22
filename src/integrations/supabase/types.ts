export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_creation_sessions: {
        Row: {
          created_at: string | null
          email: string
          error_details: string | null
          id: string
          ip_address: unknown | null
          state: string
          step: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          error_details?: string | null
          id?: string
          ip_address?: unknown | null
          state?: string
          step?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          error_details?: string | null
          id?: string
          ip_address?: unknown | null
          state?: string
          step?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      apps: {
        Row: {
          app_icon_url: string | null
          app_name: string
          app_store_id: string | null
          bundle_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          developer_name: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          platform: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          app_icon_url?: string | null
          app_name: string
          app_store_id?: string | null
          bundle_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          developer_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          platform: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          app_icon_url?: string | null
          app_name?: string
          app_store_id?: string | null
          bundle_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          developer_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          platform?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aso_metrics: {
        Row: {
          app_id: string
          conversion_rate: number | null
          country: string | null
          created_at: string
          data_source: string | null
          date: string
          downloads: number
          id: string
          impressions: number
          organization_id: string
          product_page_views: number
          raw_data: Json | null
          revenue: number | null
          sessions: number | null
        }
        Insert: {
          app_id: string
          conversion_rate?: number | null
          country?: string | null
          created_at?: string
          data_source?: string | null
          date: string
          downloads?: number
          id?: string
          impressions?: number
          organization_id: string
          product_page_views?: number
          raw_data?: Json | null
          revenue?: number | null
          sessions?: number | null
        }
        Update: {
          app_id?: string
          conversion_rate?: number | null
          country?: string | null
          created_at?: string
          data_source?: string | null
          date?: string
          downloads?: number
          id?: string
          impressions?: number
          organization_id?: string
          product_page_views?: number
          raw_data?: Json | null
          revenue?: number | null
          sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aso_metrics_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aso_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "aso_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_keywords: {
        Row: {
          analyzed_at: string
          competitor_app_id: string
          competitor_rank: number | null
          created_at: string
          gap_opportunity: string | null
          id: string
          keyword: string
          keyword_difficulty: number | null
          organization_id: string
          search_volume: number | null
          target_app_id: string
          target_rank: number | null
        }
        Insert: {
          analyzed_at?: string
          competitor_app_id: string
          competitor_rank?: number | null
          created_at?: string
          gap_opportunity?: string | null
          id?: string
          keyword: string
          keyword_difficulty?: number | null
          organization_id: string
          search_volume?: number | null
          target_app_id: string
          target_rank?: number | null
        }
        Update: {
          analyzed_at?: string
          competitor_app_id?: string
          competitor_rank?: number | null
          created_at?: string
          gap_opportunity?: string | null
          id?: string
          keyword?: string
          keyword_difficulty?: number | null
          organization_id?: string
          search_volume?: number | null
          target_app_id?: string
          target_rank?: number | null
        }
        Relationships: []
      }
      data_cache: {
        Row: {
          cache_key: string
          created_at: string
          data: Json
          expires_at: string
          id: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          data: Json
          expires_at: string
          id?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          api_endpoint: string | null
          context: Json | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          error_type: string
          id: string
          ip_address: unknown | null
          organization_id: string | null
          request_data: Json | null
          resolved: boolean | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          api_endpoint?: string | null
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          error_type: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          request_data?: Json | null
          resolved?: boolean | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          api_endpoint?: string | null
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          error_type?: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          request_data?: Json | null
          resolved?: boolean | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_clusters: {
        Row: {
          avg_difficulty: number | null
          cluster_name: string
          cluster_type: string | null
          created_at: string
          id: string
          opportunity_score: number | null
          organization_id: string
          primary_keyword: string
          related_keywords: string[]
          total_search_volume: number | null
          updated_at: string
        }
        Insert: {
          avg_difficulty?: number | null
          cluster_name: string
          cluster_type?: string | null
          created_at?: string
          id?: string
          opportunity_score?: number | null
          organization_id: string
          primary_keyword: string
          related_keywords: string[]
          total_search_volume?: number | null
          updated_at?: string
        }
        Update: {
          avg_difficulty?: number | null
          cluster_name?: string
          cluster_type?: string | null
          created_at?: string
          id?: string
          opportunity_score?: number | null
          organization_id?: string
          primary_keyword?: string
          related_keywords?: string[]
          total_search_volume?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      keyword_difficulty_scores: {
        Row: {
          calculated_at: string
          calculation_method: string | null
          competition_level: string | null
          country: string
          difficulty_score: number
          expires_at: string
          id: string
          keyword: string
          organization_id: string
          search_volume: number | null
          top_apps_strength: number | null
        }
        Insert: {
          calculated_at?: string
          calculation_method?: string | null
          competition_level?: string | null
          country?: string
          difficulty_score: number
          expires_at?: string
          id?: string
          keyword: string
          organization_id: string
          search_volume?: number | null
          top_apps_strength?: number | null
        }
        Update: {
          calculated_at?: string
          calculation_method?: string | null
          competition_level?: string | null
          country?: string
          difficulty_score?: number
          expires_at?: string
          id?: string
          keyword?: string
          organization_id?: string
          search_volume?: number | null
          top_apps_strength?: number | null
        }
        Relationships: []
      }
      keyword_ranking_history: {
        Row: {
          app_id: string
          confidence: string | null
          created_at: string
          created_by: string | null
          id: string
          keyword: string
          metadata: Json | null
          organization_id: string
          position: number | null
          search_results: number | null
          trend: string | null
          volume: string | null
        }
        Insert: {
          app_id: string
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          keyword: string
          metadata?: Json | null
          organization_id: string
          position?: number | null
          search_results?: number | null
          trend?: string | null
          volume?: string | null
        }
        Update: {
          app_id?: string
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          keyword?: string
          metadata?: Json | null
          organization_id?: string
          position?: number | null
          search_results?: number | null
          trend?: string | null
          volume?: string | null
        }
        Relationships: []
      }
      keyword_ranking_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          input_data: Json
          job_type: string
          organization_id: string
          priority: number | null
          result_data: Json | null
          scheduled_at: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_data: Json
          job_type: string
          organization_id: string
          priority?: number | null
          result_data?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          organization_id?: string
          priority?: number | null
          result_data?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      keyword_rankings: {
        Row: {
          app_store_id: string
          checked_at: string
          country: string
          id: number
          keyword: string
          organization_id: string
          rank: number | null
        }
        Insert: {
          app_store_id: string
          checked_at?: string
          country: string
          id?: number
          keyword: string
          organization_id: string
          rank?: number | null
        }
        Update: {
          app_store_id?: string
          checked_at?: string
          country?: string
          id?: number
          keyword?: string
          organization_id?: string
          rank?: number | null
        }
        Relationships: []
      }
      keyword_service_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_unit: string
          metric_value: number
          organization_id: string
          recorded_at: string
          tags: Json | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_unit: string
          metric_value: number
          organization_id: string
          recorded_at?: string
          tags?: Json | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_unit?: string
          metric_value?: number
          organization_id?: string
          recorded_at?: string
          tags?: Json | null
        }
        Relationships: []
      }
      keyword_volume_history: {
        Row: {
          country: string
          created_at: string
          data_source: string | null
          id: string
          keyword: string
          organization_id: string
          popularity_score: number | null
          recorded_date: string
          search_volume: number | null
          search_volume_trend: string | null
        }
        Insert: {
          country?: string
          created_at?: string
          data_source?: string | null
          id?: string
          keyword: string
          organization_id: string
          popularity_score?: number | null
          recorded_date?: string
          search_volume?: number | null
          search_volume_trend?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          data_source?: string | null
          id?: string
          keyword?: string
          organization_id?: string
          popularity_score?: number | null
          recorded_date?: string
          search_volume?: number | null
          search_volume_trend?: string | null
        }
        Relationships: []
      }
      metadata_versions: {
        Row: {
          app_store_id: string
          created_at: string
          created_by: string | null
          id: string
          is_live: boolean
          keywords: string
          notes: string | null
          organization_id: string
          score: Json | null
          subtitle: string
          title: string
        }
        Insert: {
          app_store_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_live?: boolean
          keywords: string
          notes?: string | null
          organization_id: string
          score?: Json | null
          subtitle: string
          title: string
        }
        Update: {
          app_store_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_live?: boolean
          keywords?: string
          notes?: string | null
          organization_id?: string
          score?: Json | null
          subtitle?: string
          title?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          api_limits: Json | null
          app_limit: number | null
          app_limit_enforced: boolean | null
          billing_email: string | null
          created_at: string
          features: Json | null
          id: string
          name: string
          settings: Json | null
          slug: string
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          api_limits?: Json | null
          app_limit?: number | null
          app_limit_enforced?: boolean | null
          billing_email?: string | null
          created_at?: string
          features?: Json | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          api_limits?: Json | null
          app_limit?: number | null
          app_limit_enforced?: boolean | null
          billing_email?: string | null
          created_at?: string
          features?: Json | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          organization_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          daily_ai_calls: number | null
          daily_metadata_generations: number | null
          hourly_ai_calls: number | null
          last_daily_reset: string | null
          last_hourly_reset: string | null
          last_monthly_reset: string | null
          monthly_ai_calls: number | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
          user_tier: string | null
        }
        Insert: {
          daily_ai_calls?: number | null
          daily_metadata_generations?: number | null
          hourly_ai_calls?: number | null
          last_daily_reset?: string | null
          last_hourly_reset?: string | null
          last_monthly_reset?: string | null
          monthly_ai_calls?: number | null
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
          user_tier?: string | null
        }
        Update: {
          daily_ai_calls?: number | null
          daily_metadata_generations?: number | null
          hourly_ai_calls?: number | null
          last_daily_reset?: string | null
          last_hourly_reset?: string | null
          last_monthly_reset?: string | null
          monthly_ai_calls?: number | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rate_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          permission_name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          permission_name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_name_fkey"
            columns: ["permission_name"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["name"]
          },
        ]
      }
      scrape_cache: {
        Row: {
          data: Json | null
          error: string | null
          expires_at: string
          id: string
          organization_id: string | null
          scraped_at: string
          status: string
          url: string
        }
        Insert: {
          data?: Json | null
          error?: string | null
          expires_at: string
          id?: string
          organization_id?: string | null
          scraped_at?: string
          status: string
          url: string
        }
        Update: {
          data?: Json | null
          error?: string | null
          expires_at?: string
          id?: string
          organization_id?: string | null
          scraped_at?: string
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scrape_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_sources: {
        Row: {
          created_at: string
          display_name: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          action_type: string
          ai_calls_used: number | null
          api_endpoint: string | null
          created_at: string | null
          id: string
          metadata_generated: Json | null
          organization_id: string | null
          processing_time_ms: number | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          ai_calls_used?: number | null
          api_endpoint?: string | null
          created_at?: string | null
          id?: string
          metadata_generated?: Json | null
          organization_id?: string | null
          processing_time_ms?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          ai_calls_used?: number | null
          api_endpoint?: string | null
          created_at?: string | null
          id?: string
          metadata_generated?: Json | null
          organization_id?: string | null
          processing_time_ms?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      organization_app_usage: {
        Row: {
          active_apps: number | null
          app_limit: number | null
          app_limit_enforced: boolean | null
          current_app_count: number | null
          inactive_apps: number | null
          organization_id: string | null
          organization_name: string | null
          remaining_apps: number | null
          subscription_tier: string | null
          usage_percentage: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_super_admin_role: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      can_add_app: {
        Args: { org_id: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: { permission_to_check: string; target_organization_id?: string }
        Returns: boolean
      }
      clean_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_keyword_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_keyword_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_organization_and_assign_admin: {
        Args: { org_name: string; org_slug: string }
        Returns: string
      }
      get_current_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_keyword_gap_analysis: {
        Args: {
          p_organization_id: string
          p_target_app_id: string
          p_limit?: number
        }
        Returns: {
          keyword: string
          target_rank: number
          best_competitor_rank: number
          gap_opportunity: string
          search_volume: number
          difficulty_score: number
        }[]
      }
      get_keyword_volume_trends: {
        Args: {
          p_organization_id: string
          p_keyword: string
          p_days_back?: number
        }
        Returns: {
          recorded_date: string
          search_volume: number
          popularity_score: number
          trend_direction: string
        }[]
      }
      get_user_organization_with_fallback: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      lock_platform_admin_creation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      log_scraper_request: {
        Args: {
          p_organization_id: string
          p_search_term: string
          p_user_agent?: string
          p_ip_address?: unknown
        }
        Returns: boolean
      }
      unlock_platform_admin_creation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "SUPER_ADMIN"
        | "ORGANIZATION_ADMIN"
        | "MANAGER"
        | "ANALYST"
        | "VIEWER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "SUPER_ADMIN",
        "ORGANIZATION_ADMIN",
        "MANAGER",
        "ANALYST",
        "VIEWER",
      ],
    },
  },
} as const
