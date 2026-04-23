<?php

namespace App\Http\Controllers;

use App\Models\MenuItem;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MenuItemController extends Controller
{
    private function restaurant(): Restaurant
    {
        if (app()->bound('restaurant')) {
            return app('restaurant');
        }

        return Restaurant::where('is_active', true)->firstOrFail();
    }

    public function index()
    {
        $items = MenuItem::orderBy('sort_order')->orderBy('id')->get()->map(function ($item) {
            return array_merge($item->toArray(), [
                'image_url' => $item->image_path
                    ? asset('storage/' . $item->image_path)
                    : null,
            ]);
        });

        return response()->json($items);
    }

    // Public endpoint — no auth required (uses phone_number_id query param to identify restaurant)
    public function publicMenu(Request $request)
    {
        $phoneId    = $request->query('phone_id');
        $restaurant = $phoneId
            ? Restaurant::where('whatsapp_phone_id', $phoneId)->where('is_active', true)->first()
            : null;

        $query = MenuItem::where('available', true)
            ->orderBy('sort_order')
            ->orderBy('id');

        $items = $query->get()->map(function ($item) {
            return array_merge($item->toArray(), [
                'image_url' => $item->image_path
                    ? asset('storage/' . $item->image_path)
                    : null,
            ]);
        });

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'slug'        => 'required|string|max:50|unique:menu_items,slug|regex:/^[a-z0-9_]+$/',
            'category'    => 'required|string|max:50',
            'price'       => 'required|numeric|min:0',
            'description' => 'nullable|string|max:255',
            'emoji'       => 'nullable|string|max:10',
            'available'   => 'boolean',
            'sort_order'  => 'integer',
            'image'       => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('menu', 'public');
        }

        $item = MenuItem::create([
            'name'        => $validated['name'],
            'slug'        => $validated['slug'],
            'category'    => $validated['category'],
            'price'       => $validated['price'],
            'description' => $validated['description'] ?? null,
            'emoji'       => $validated['emoji'] ?? '🍽️',
            'available'   => $validated['available'] ?? true,
            'sort_order'  => $validated['sort_order'] ?? 0,
            'image_path'  => $imagePath,
        ]);

        return response()->json(array_merge($item->toArray(), [
            'image_url' => $imagePath ? asset('storage/' . $imagePath) : null,
        ]), 201);
    }

    public function update(Request $request, int $id)
    {
        $item = MenuItem::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'category'    => 'sometimes|string|max:50',
            'price'       => 'sometimes|numeric|min:0',
            'description' => 'nullable|string|max:255',
            'emoji'       => 'nullable|string|max:10',
            'available'   => 'sometimes|boolean',
            'sort_order'  => 'sometimes|integer',
            'image'       => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        if ($request->hasFile('image')) {
            // Delete old image
            if ($item->image_path) {
                Storage::disk('public')->delete($item->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('menu', 'public');
        }

        unset($validated['image']);
        $item->update($validated);

        return response()->json(array_merge($item->fresh()->toArray(), [
            'image_url' => $item->image_path ? asset('storage/' . $item->image_path) : null,
        ]));
    }

    public function destroy(int $id)
    {
        $item = MenuItem::findOrFail($id);

        if ($item->image_path) {
            Storage::disk('public')->delete($item->image_path);
        }

        $item->delete();

        return response()->json(['ok' => true]);
    }
}
