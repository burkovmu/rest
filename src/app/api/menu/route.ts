import { NextResponse } from 'next/server';
import { MenuCategory } from '@/types/menu';
import { menuItems as initialMenuItems } from '@/components/Menu';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const menuFilePath = path.join(process.cwd(), 'src/data/menu.json');

export async function GET() {
  try {
    // Пытаемся прочитать меню из файла
    try {
      const menuData = await fs.readFile(menuFilePath, 'utf-8');
      return NextResponse.json(JSON.parse(menuData));
    } catch (error) {
      // Если файл не существует, возвращаем начальные данные
      return NextResponse.json(initialMenuItems);
    }
  } catch (error) {
    console.error('Ошибка при чтении меню:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке меню' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const menu: MenuCategory[] = await request.json();
    
    // Создаем директорию, если она не существует
    await fs.mkdir(path.dirname(menuFilePath), { recursive: true });
    
    // Сохраняем меню в файл
    await fs.writeFile(menuFilePath, JSON.stringify(menu, null, 2));
    
    return NextResponse.json({ message: 'Меню успешно обновлено' });
  } catch (error) {
    console.error('Ошибка при обновлении меню:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении меню' },
      { status: 500 }
    );
  }
} 