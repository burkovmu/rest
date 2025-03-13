import { MenuCategory, MenuItem } from '@/types/menu';
import { menuItems as initialMenuItems } from '@/components/Menu';

export const menuService = {
  async loadMenu(): Promise<MenuCategory[]> {
    try {
      // Загружаем меню с сервера
      const response = await fetch('/api/menu');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
      
      // Если что-то пошло не так, возвращаем начальные данные
      return initialMenuItems;
    } catch (error) {
      console.error('Ошибка при загрузке меню:', error);
      return initialMenuItems;
    }
  },

  async saveMenu(menu: MenuCategory[]): Promise<void> {
    try {
      const response = await fetch('/api/menu', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(menu),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при сохранении меню');
      }
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

  findItemAndParent(items: MenuItem[], itemPath: string[]): { item: MenuItem | null, parent: MenuItem | null, parentPath: string[] } {
    if (itemPath.length === 0) return { item: null, parent: null, parentPath: [] };
    
    const traverse = (currentItems: MenuItem[], path: string[], currentPath: string[] = []): { item: MenuItem | null, parent: MenuItem | null, parentPath: string[] } => {
      if (path.length === 1) {
        const item = currentItems.find(i => i.name === path[0]);
        return { item: item || null, parent: null, parentPath: currentPath };
      }

      const currentItem = currentItems.find(i => i.name === path[0]);
      if (!currentItem?.items) return { item: null, parent: null, parentPath: [] };

      const result = traverse(currentItem.items, path.slice(1), [...currentPath, currentItem.name]);
      if (result.item && !result.parent) {
        result.parent = currentItem;
      }
      return result;
    };

    return traverse(items, itemPath);
  },

  async deleteItem(menu: MenuCategory[], categoryName: string, itemPath: string[]): Promise<MenuCategory[]> {
    const updatedMenu = menu.map(category => {
      if (category.category !== categoryName) return category;

      const deleteFromItems = (items: MenuItem[], path: string[]): MenuItem[] => {
        if (path.length === 1) {
          return items.filter(item => item.name !== path[0]);
        }

        const currentItem = items.find(item => item.name === path[0]);
        if (!currentItem?.items) return items;

        return items.map(item => {
          if (item.name === path[0]) {
            return {
              ...item,
              items: deleteFromItems(item.items || [], path.slice(1))
            };
          }
          return item;
        });
      };

      return {
        ...category,
        items: deleteFromItems(category.items, itemPath)
      };
    });

    await this.saveMenu(updatedMenu);
    return updatedMenu;
  },

  async addItem(
    menu: MenuCategory[],
    categoryName: string,
    item: MenuItem,
    path: string[] = []
  ): Promise<MenuCategory[]> {
    const updatedMenu = menu.map(category => {
      if (category.category !== categoryName) return category;

      const addItemToPath = (items: MenuItem[], currentPath: string[]): MenuItem[] => {
        if (currentPath.length === 0) {
          return [...items, item];
        }

        return items.map(currentItem => {
          if (currentItem.name === currentPath[0] && currentItem.isSubcategory) {
            return {
              ...currentItem,
              items: addItemToPath(currentItem.items || [], currentPath.slice(1))
            };
          }
          return currentItem;
        });
      };

      return {
        ...category,
        items: addItemToPath(category.items, path)
      };
    });

    await this.saveMenu(updatedMenu);
    return updatedMenu;
  },

  async updateItem(
    menu: MenuCategory[],
    categoryName: string,
    updatedItem: MenuItem,
    path: string[]
  ): Promise<MenuCategory[]> {
    const updatedMenu = [...menu];
    const category = updatedMenu.find(cat => cat.category === categoryName);
    
    if (!category) return updatedMenu;

    const updateItemInArray = (items: MenuItem[], currentPath: string[]): MenuItem[] => {
      return items.map(item => {
        if (item.name === currentPath[0]) {
          if (currentPath.length === 1) {
            // Если это подкатегория, сохраняем существующие items
            if (updatedItem.isSubcategory && item.items) {
              return { ...updatedItem, items: item.items };
            }
            return updatedItem;
          }
          return {
            ...item,
            items: item.items ? updateItemInArray(item.items, currentPath.slice(1)) : undefined
          };
        }
        return item;
      });
    };

    category.items = updateItemInArray(category.items, path);
    await this.saveMenu(updatedMenu);
    return updatedMenu;
  },

  async updateItemWithMove(
    menu: MenuCategory[],
    oldCategory: string,
    oldPath: string[],
    newCategory: string,
    newPath: string[],
    updatedItem: MenuItem
  ): Promise<MenuCategory[]> {
    let updatedMenu = [...menu];

    // Если это подкатегория, сохраняем существующие items
    if (updatedItem.isSubcategory) {
      const { item } = this.findItemAndParent(
        menu.find(cat => cat.category === oldCategory)?.items || [],
        oldPath
      );
      if (item && item.items) {
        updatedItem.items = item.items;
      }
    }

    // Если категория или путь изменились, удаляем из старого места и добавляем в новое
    if (oldCategory !== newCategory || JSON.stringify(oldPath) !== JSON.stringify(newPath)) {
      updatedMenu = await this.deleteItem(updatedMenu, oldCategory, oldPath);
      updatedMenu = await this.addItem(updatedMenu, newCategory, updatedItem, newPath.slice(0, -1));
    } else {
      // Просто обновляем элемент на месте
      updatedMenu = await this.updateItem(updatedMenu, oldCategory, updatedItem, oldPath);
    }

    await this.saveMenu(updatedMenu);
    return updatedMenu;
  }
}; 