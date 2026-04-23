<?php

namespace App\Http\Controllers;

use App\Models\Restaurant;
use App\Models\TeamMember;
use Illuminate\Http\Request;

class TeamController extends Controller
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
        return response()->json(
            TeamMember::orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'      => 'required|string|max:80',
            'phone'     => 'required|string|max:20|unique:team_members,phone',
            'role'      => 'required|in:admin,driver,staff',
            'is_active' => 'boolean',
            'note'      => 'nullable|string|max:255',
        ]);

        $member = TeamMember::create($data);
        return response()->json($member, 201);
    }

    public function update(Request $request, $id)
    {
        $member = TeamMember::findOrFail($id);

        $data = $request->validate([
            'name'      => 'sometimes|string|max:80',
            'phone'     => 'sometimes|string|max:20|unique:team_members,phone,' . $id . ',id',
            'role'      => 'sometimes|in:admin,driver,staff',
            'is_active' => 'sometimes|boolean',
            'note'      => 'nullable|string|max:255',
        ]);

        $member->update($data);
        return response()->json($member->fresh());
    }

    public function destroy($id)
    {
        TeamMember::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }
}
