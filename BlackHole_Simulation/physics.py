import numpy as np

def calculate_gravity(probe_pos, bh_pos, mass_bh, g_const, min_dist=10.0):
    diff = bh_pos - probe_pos
    dist = np.linalg.norm(diff)
    if dist < min_dist:
        dist = min_dist

    direction = diff / dist
    acc_magnitude = (g_const * mass_bh) / (dist ** 2)
    return direction * acc_magnitude

def predict_trajectory(pos, vel, bh_pos, mass_bh, g_const, event_horizon_r, screen_width, screen_height, steps=400, dt=1.0):
    # Used for the sandbox launch preview line
    points = []
    curr_pos = np.array(pos, dtype=float)
    curr_vel = np.array(vel, dtype=float)
    bh_pos_arr = np.array(bh_pos, dtype=float)

    for _ in range(steps):
        diff = bh_pos_arr - curr_pos
        dist = np.linalg.norm(diff)

        if dist < event_horizon_r:
            points.append(curr_pos.copy())
            break

        if (curr_pos[0] < -200 or curr_pos[0] > screen_width + 200 or
            curr_pos[1] < -200 or curr_pos[1] > screen_height + 200):
            break

        r = max(dist, 5.0)
        acc = diff * (g_const * mass_bh / (r ** 3))

        curr_vel += acc * dt
        curr_pos += curr_vel * dt
        points.append(curr_pos.copy())

    return points

def calculate_time_dilation(dist_to_bh, speed, rs, c_speed):
    # Schwarzschild metric approximation: sqrt(1 - Rs/r - v^2/c^2)
    if dist_to_bh <= rs:
        return 0.0

    grav_term = rs / dist_to_bh
    velocity_term = (speed ** 2) / (c_speed ** 2)

    inner = 1.0 - grav_term - velocity_term
    if inner < 0:
        return 0.0

    return np.sqrt(inner)

def warp_star_position(star_pos, bh_pos, rs, lensing_strength=0.85):
    # Pushes coordinates outward to fake an Einstein ring effect
    diff = star_pos - bh_pos
    dist = np.linalg.norm(diff)

    if dist < rs:
        return None

    displacement = (rs * rs * lensing_strength) / dist
    r_prime = dist + displacement

    direction = diff / dist
    warped_pos = bh_pos + direction * r_prime
    return warped_pos
