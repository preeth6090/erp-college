'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { run, audit, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, optDate, oneOf, int, optInt, num } from '@/lib/validators';

const G = { module: 'transport' } as const;
const blank = (v: unknown) => (v === '' || v === null ? undefined : v);
/** Live-tracking links must be real web links — never javascript: or similar. */
const link = () => z.preprocess(blank, z.string().trim().max(1000).url('must be a full link starting with https://').refine((u) => /^https?:\/\//i.test(u), 'must start with http:// or https://').optional());

const vehicleShape = {
  registration_no: str(40), vehicle_type: oneOf(['Bus', 'Mini Bus', 'Van'] as const), capacity: int(1, 200),
  driver_name: optStr(100), driver_phone: optStr(20), driver_license: optStr(40), gps_device_id: optStr(60),
  tracking_url: link(), insurance_expiry: optDate(), fitness_expiry: optDate(),
};

export async function addVehicle(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object(vehicleShape), fd);
    const reg = d.registration_no.replace(/\s+/g, ' ');
    await db.transportVehicle.create({ data: { ...d, registration_no: reg, driver_name: d.driver_name ?? '—', driver_phone: d.driver_phone ?? '—' } });
    await audit(actor, 'VEHICLE_ADDED', 'Transport', `Added vehicle ${reg}`);
    return `Vehicle ${reg} added${d.tracking_url ? ' with its live-tracking link' : ' — add its OneLap tracking link so staff and parents can see where it is'}.`;
  });
}

export async function updateVehicle(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ id: int(1), ...vehicleShape }), fd);
    const { id, ...rest } = d;
    const reg = rest.registration_no.replace(/\s+/g, ' ');
    await db.transportVehicle.update({ where: { id }, data: { ...rest, registration_no: reg, driver_name: rest.driver_name ?? '—', driver_phone: rest.driver_phone ?? '—', tracking_url: rest.tracking_url ?? null, driver_license: rest.driver_license ?? null, gps_device_id: rest.gps_device_id ?? null, insurance_expiry: rest.insurance_expiry ?? null, fitness_expiry: rest.fitness_expiry ?? null } });
    await audit(actor, 'VEHICLE_UPDATED', 'Transport', `Updated vehicle ${reg}`);
    return `Vehicle ${reg} updated.`;
  });
}

export async function deleteVehicle(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ id: int(1) }), fd);
    const v = await db.transportVehicle.findUniqueOrThrow({ where: { id: d.id }, include: { _count: { select: { transportRoutes: true } } } });
    if (v._count.transportRoutes > 0) throw new UserError('Move this vehicle’s routes to another vehicle first.');
    await db.transportVehicle.delete({ where: { id: d.id } });
    await audit(actor, 'VEHICLE_REMOVED', 'Transport', `Removed vehicle ${v.registration_no}`);
    return `Vehicle ${v.registration_no} removed.`;
  });
}

const stops = () => z.preprocess(blank, z.string().max(4000).optional());
const toStops = (t?: string) => JSON.stringify([...new Set((t ?? '').split(/[\n,;→>]+/).map((x) => x.trim()).filter(Boolean))].slice(0, 60));

export async function addRoute(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async () => {
    const d = parse(z.object({ route_name: str(120), transport_vehicle_id: optInt(1), stops: stops(), monthly_fee: num(0) }), fd);
    await db.transportRoute.create({ data: { route_name: d.route_name, transport_vehicle_id: d.transport_vehicle_id, stops_json: toStops(d.stops), monthly_fee: d.monthly_fee } });
    return `Route “${d.route_name}” added.`;
  });
}

export async function updateRoute(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async () => {
    const d = parse(z.object({ id: int(1), route_name: str(120), transport_vehicle_id: optInt(1), stops: stops(), monthly_fee: num(0) }), fd);
    await db.transportRoute.update({ where: { id: d.id }, data: { route_name: d.route_name, transport_vehicle_id: d.transport_vehicle_id ?? null, stops_json: toStops(d.stops), monthly_fee: d.monthly_fee } });
    return 'Route updated.';
  });
}

export async function cancelAllocation(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async () => {
    const d = parse(z.object({ id: int(1) }), fd);
    await db.transportAllocation.update({ where: { id: d.id }, data: { status: 'Cancelled' } });
    return 'Transport cancelled for this student.';
  });
}

/** Optional link to the OneLap fleet dashboard (all vehicles on one map). */
export async function saveFleetLink(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ fleet_url: link() }), fd);
    await db.systemSetting.upsert({ where: { key: 'transport.fleet_url' }, update: { value: d.fleet_url ?? '' }, create: { key: 'transport.fleet_url', group_name: 'transport', value: d.fleet_url ?? '' } });
    updateTag('transport');
    await audit(actor, 'FLEET_LINK_SAVED', 'Transport', 'Updated OneLap fleet link');
    return d.fleet_url ? 'Fleet map link saved.' : 'Fleet map link removed.';
  });
}
