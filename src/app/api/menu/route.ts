import { NextResponse } from 'next/server';
import { MenuCategory } from '@/types/menu';
import { menuItems as initialMenuItems } from '@/components/Menu';

export const runtime = 'edge';

let menuData = initialMenuItems;

export async function GET() {
  try {
    return NextResponse.json(menuData);
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
    menuData = menu;
    return NextResponse.json({ message: 'Меню успешно обновлено' });
  } catch (error) {
    console.error('Ошибка при обновлении меню:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении меню' },
      { status: 500 }
    );
  }
} 