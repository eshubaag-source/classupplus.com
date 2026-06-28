// src/app/api/vehicles/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Vehicle } from '@/models/Vehicle';
import { getAdminId } from '@/lib/auth';

export async function GET() {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const vehicles = await Vehicle.find({ adminId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(vehicles);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch vehicles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const payload = await request.json();

    if (!payload.vehicleNumber || !payload.city || payload.totalFees == null) {
      return NextResponse.json({ message: 'Vehicle number, city, and total fees are required.' }, { status: 400 });
    }

    const vehicle = new Vehicle({ ...payload, adminId });
    await vehicle.save();
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'A vehicle with this number already exists.' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || 'Failed to create vehicle' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

    const payload = await request.json();
    const updated = await Vehicle.findOneAndUpdate({ _id: id, adminId }, payload, { new: true });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to update vehicle' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

    await Vehicle.deleteOne({ _id: id, adminId });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to delete vehicle' }, { status: 500 });
  }
}
