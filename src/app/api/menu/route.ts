import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { MenuCategory } from '@/types/menu';

const menuPath = path.join(process.cwd(), 'public/menu-data.json');

export async function GET() {
  try {
    const menuData = await fs.readFile(menuPath, 'utf-8');
    return NextResponse.json(JSON.parse(menuData));
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
    await fs.writeFile(menuPath, JSON.stringify(menu, null, 2));
    return NextResponse.json({ message: 'Меню успешно обновлено' });
  } catch (error) {
    console.error('Ошибка при обновлении меню:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении меню' },
      { status: 500 }
    );
  }
} 