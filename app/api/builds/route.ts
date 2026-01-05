import { NextResponse } from 'next/server';
import { FileSystemBuildRepository } from '@/infrastructure/FileSystemBuildRepository';

const repository = new FileSystemBuildRepository();

export async function GET() {
  try {
    const builds = await repository.findAll();
    return NextResponse.json(builds);
  } catch (error) {
    console.error('Failed to fetch builds:', error);
    return NextResponse.json({ error: 'Failed to fetch builds' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newBuild = await request.json();
    const builds = await repository.findAll();

    // Add timestamps
    newBuild.createdAt = new Date();
    newBuild.updatedAt = new Date();

    builds.push(newBuild);
    await repository.save(builds);

    return NextResponse.json(newBuild, { status: 201 });
  } catch (error) {
    console.error('Failed to add build:', error);
    return NextResponse.json({ error: 'Failed to add build' }, { status: 500 });
  }
}

