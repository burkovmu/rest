export interface MenuItem {
  name: string;
  price: string;
  description: string;
  image: string;
  nutrition: {
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
  };
  weight?: string;
  isSubcategory?: boolean;
  level?: number;
  items?: MenuItem[];
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
} 