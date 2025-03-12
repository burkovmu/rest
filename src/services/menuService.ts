import { MenuCategory } from '@/types/menu';
import { menuItems as initialMenuItems } from '@/components/Menu';

interface MenuItem {
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
  subcategory?: MenuItem[];
}

const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
};

export const menuService = {
  async loadMenu(): Promise<MenuCategory[]> {
    try {
      const storage = getLocalStorage();
      
      // Если мы на клиенте и есть localStorage
      if (storage) {
        const savedMenu = storage.getItem('menuItems');
        if (savedMenu) {
          const parsedMenu = JSON.parse(savedMenu);
          if (Array.isArray(parsedMenu) && parsedMenu.length > 0) {
            return parsedMenu;
          }
        }
      }
      
      // Если нет сохраненного меню, пробуем загрузить с сервера
      const response = await fetch('/api/menu');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          // Сохраняем в localStorage только на клиенте
          if (storage) {
            storage.setItem('menuItems', JSON.stringify(data));
          }
          return data;
        }
      }
      
      // Если всё остальное не сработало, возвращаем начальные данные
      return initialMenuItems;
    } catch (error) {
      console.error('Ошибка при загрузке меню:', error);
      return initialMenuItems;
    }
  },

  async saveMenu(menu: MenuCategory[]): Promise<void> {
    try {
      const storage = getLocalStorage();
      if (storage) {
        storage.setItem('menuItems', JSON.stringify(menu));
      }
      
      await fetch('/api/menu', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(menu),
      });
    } catch (error) {
      console.error('Ошибка при сохранении меню:', error);
      throw error;
    }
  },

  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке изображения');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Ошибка при загрузке изображения:', error);
      throw error;
    }
  },

  async addCategory(menu: MenuCategory[], newCategory: string): Promise<MenuCategory[]> {
    const updatedMenu = [...menu, { category: newCategory, items: [] }];
    await this.saveMenu(updatedMenu);
    return updatedMenu;
  },

  async deleteCategory(menu: MenuCategory[], categoryName: string): Promise<MenuCategory[]> {
    const updatedMenu = menu.filter(category => category.category !== categoryName);
    await this.saveMenu(updatedMenu);
    return updatedMenu;
  },

  async deleteItem(menu: MenuCategory[], categoryName: string, itemName: string, subcategoryName?: string): Promise<MenuCategory[]> {
    const updatedMenu = menu.map(category => {
      if (category.category === categoryName) {
        return {
          ...category,
          items: category.items.map(item => {
            if (subcategoryName && item.name === subcategoryName) {
              return {
                ...item,
                subcategory: (item.subcategory || []).filter(subItem => subItem.name !== itemName)
              };
            }
            return item;
          }).filter(item => item.name !== itemName || subcategoryName)
        };
      }
      return category;
    });
    await this.saveMenu(updatedMenu);
    return updatedMenu;
  },

  async updateItem(menu: MenuCategory[], categoryName: string, updatedItem: MenuItem, subcategoryName?: string): Promise<MenuCategory[]> {
    const updatedMenu = menu.map(category => {
      if (category.category === categoryName) {
        return {
          ...category,
          items: category.items.map(item => {
            if (subcategoryName) {
              if (item.name === subcategoryName) {
                return {
                  ...item,
                  subcategory: (item.subcategory || []).map(subItem => 
                    subItem.name === updatedItem.name ? updatedItem : subItem
                  )
                };
              }
              return item;
            } else {
              return item.name === updatedItem.name ? updatedItem : item;
            }
          })
        };
      }
      return category;
    });

    await this.saveMenu(updatedMenu);
    return updatedMenu;
  }
}; 