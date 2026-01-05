import { NextResponse } from 'next/server';
import { FileSystemBuildRepository } from '@/infrastructure/FileSystemBuildRepository';
import { AddBuildUseCase } from '@/use-cases/addBuild';
import { ListBuildsUseCase } from '@/use-cases/listBuilds';
import { ValidationError } from '@/domain/validation';

const repository = new FileSystemBuildRepository();

export async function GET() {
  try {
    const useCase = new ListBuildsUseCase(repository);
    const builds = await useCase.execute();
    return NextResponse.json(builds);
  } catch (error) {
    console.error('Failed to fetch builds:', error);
    return NextResponse.json({ error: 'Failed to fetch builds' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newBuild = await request.json();
    const useCase = new AddBuildUseCase(repository);
    const savedBuild = await useCase.execute(newBuild);

    return NextResponse.json(savedBuild, { status: 201 });
  } catch (error) {
    console.error('Failed to add build:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to add build' }, { status: 500 });
  }
}

