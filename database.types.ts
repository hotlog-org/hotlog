export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4'
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: number
          key: string
          project_id: string
        }
        Insert: {
          id?: number
          key?: string
          project_id: string
        }
        Update: {
          id?: number
          key?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'api_keys_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      components: {
        Row: {
          created_at: string
          description: string
          id: string
          index: number
          inputs_ids: Json
          layout_id: number
          name: string
          type: Database['public']['Enums']['ComponentTypes']
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          index: number
          inputs_ids: Json
          layout_id: number
          name: string
          type: Database['public']['Enums']['ComponentTypes']
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          index?: number
          inputs_ids?: Json
          layout_id?: number
          name?: string
          type?: Database['public']['Enums']['ComponentTypes']
        }
        Relationships: [
          {
            foreignKeyName: 'componen_layout_id_fkey'
            columns: ['layout_id']
            isOneToOne: false
            referencedRelation: 'layouts'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          id: number
          project_id: string
          schema_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: number
          project_id: string
          schema_id: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: number
          project_id?: string
          schema_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'events_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_schema_id_fkey'
            columns: ['schema_id']
            isOneToOne: false
            referencedRelation: 'schemas'
            referencedColumns: ['id']
          },
        ]
      }
      fields: {
        Row: {
          created_at: string
          display_name: string
          id: string
          key: string
          metadata: Json
          name: string
          required: boolean
          schema_id: string | null
          status: Database['public']['Enums']['field_status']
          type: Database['public']['Enums']['FieldTypes']
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          key: string
          metadata?: Json
          name?: string
          required?: boolean
          schema_id?: string | null
          status?: Database['public']['Enums']['field_status']
          type: Database['public']['Enums']['FieldTypes']
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          key?: string
          metadata?: Json
          name?: string
          required?: boolean
          schema_id?: string | null
          status?: Database['public']['Enums']['field_status']
          type?: Database['public']['Enums']['FieldTypes']
        }
        Relationships: [
          {
            foreignKeyName: 'fields_schema_id_fkey'
            columns: ['schema_id']
            isOneToOne: false
            referencedRelation: 'schemas'
            referencedColumns: ['id']
          },
        ]
      }
      layouts: {
        Row: {
          created_at: string
          description: string
          id: number
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: number
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'layouts_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          id: string
          subject: string
        }
        Insert: {
          action: string
          id?: string
          subject: string
        }
        Update: {
          action?: string
          id?: string
          subject?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_id_fkey'
            columns: ['permission_id']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'roles_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      schemas: {
        Row: {
          created_at: string
          display_name: string
          id: string
          key: string
          name: string
          project_id: string
          status: Database['public']['Enums']['schema_status']
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          key: string
          name?: string
          project_id: string
          status?: Database['public']['Enums']['schema_status']
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          key?: string
          name?: string
          project_id?: string
          status?: Database['public']['Enums']['schema_status']
        }
        Relationships: [
          {
            foreignKeyName: 'schemas_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      user_projects: {
        Row: {
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_projects_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      events_daily_counts: {
        Args: {
          p_project_id: string
          p_days: number
        }
        Returns: {
          day: string
          count: number
        }[]
      }
    }
    Enums: {
      ComponentTypes: 'TIME_SERIES'
      FieldTypes:
        | 'STRING'
        | 'NUMBER'
        | 'BOOLEAN'
        | 'DATETIME'
        | 'ARRAY'
        | 'JSON'
        | 'ENUM'
      field_status: 'active' | 'archived'
      schema_status: 'active' | 'archived'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ComponentTypes: ['TIME_SERIES'],
      FieldTypes: [
        'STRING',
        'NUMBER',
        'BOOLEAN',
        'DATETIME',
        'ARRAY',
        'JSON',
        'ENUM',
      ],
      field_status: ['active', 'archived'],
      schema_status: ['active', 'archived'],
    },
  },
} as const
