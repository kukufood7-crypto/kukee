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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          expense_type: string
          id: string
          month: number
          year: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          expense_type: string
          id?: string
          month: number
          year: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          expense_type?: string
          id?: string
          month?: number
          year?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          area: string
          created_at: string | null
          id: string
          order_date: string | null
          owner_name: string
          quantity_1kg: number | null
          quantity_30gm: number | null
          quantity_500gm: number | null
          quantity_60gm: number | null
          shop_id: string | null
          shop_name: string
          shop_number: string
          status: string | null
          total_price: number
        }
        Insert: {
          area: string
          created_at?: string | null
          id?: string
          order_date?: string | null
          owner_name: string
          quantity_1kg?: number | null
          quantity_30gm?: number | null
          quantity_500gm?: number | null
          quantity_60gm?: number | null
          shop_id?: string | null
          shop_name: string
          shop_number: string
          status?: string | null
          total_price: number
        }
        Update: {
          area?: string
          created_at?: string | null
          id?: string
          order_date?: string | null
          owner_name?: string
          quantity_1kg?: number | null
          quantity_30gm?: number | null
          quantity_500gm?: number | null
          quantity_60gm?: number | null
          shop_id?: string | null
          shop_name?: string
          shop_number?: string
          status?: string | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean | null
          reminder_date: string
          shop_id: string | null
          shop_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_date: string
          shop_id?: string | null
          shop_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_date?: string
          shop_id?: string | null
          shop_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          area: string
          created_at: string | null
          delivery_boy: string
          id: string
          last_visit_date: string | null
          owner_name: string
          shop_address: string
          shop_name: string
          shop_number: string
          updated_at: string | null
        }
        Insert: {
          area: string
          created_at?: string | null
          delivery_boy: string
          id?: string
          last_visit_date?: string | null
          owner_name: string
          shop_address: string
          shop_name: string
          shop_number: string
          updated_at?: string | null
        }
        Update: {
          area?: string
          created_at?: string | null
          delivery_boy?: string
          id?: string
          last_visit_date?: string | null
          owner_name?: string
          shop_address?: string
          shop_name?: string
          shop_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stock: {
        Row: {
          id: string
          packet_size: string
          packets_sold: number
          price: number
          total_stock_kg: number
          updated_at: string | null
        }
        Insert: {
          id?: string
          packet_size: string
          packets_sold?: number
          price: number
          total_stock_kg?: number
          updated_at?: string | null
        }
        Update: {
          id?: string
          packet_size?: string
          packets_sold?: number
          price?: number
          total_stock_kg?: number
          updated_at?: string | null
        }
        Relationships: []
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

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
