import pygame
import numpy as np
import physics
from neural_net import NeuralNetwork


class Probe:
    def __init__(self, pos, vel, brain=None):
        self.pos = pygame.Vector2(pos)
        self.vel = pygame.Vector2(vel)
        self.acc = pygame.Vector2(0, 0)

        if self.vel.length_squared() > 0:
            self.angle = pygame.Vector2(1, 0).angle_to(self.vel)
        else:
            self.angle = 0.0

        # 8 inputs, 10 hidden, 3 outputs (steer, thrust, aux)
        self.brain = brain if brain is not None else NeuralNetwork(input_size=8, hidden_size=10, output_size=3)

        self.fuel = 1000.0
        self.max_fuel = 1000.0
        self.is_alive = True
        self.death_reason = None
        self.is_completed = False

        self.is_dying = False
        self.death_timer = 0
        self.death_max_timer = 30

        self.survival_time = 0.0
        self.proper_time = 0.0
        self.distance_travelled = 0.0
        self.checkpoints_cleared = 0
        self.slingshot_points = 0
        self.fitness = 0.0

        self.min_distance_to_bh = float('inf')
        self.max_speed_near_bh = 0.0
        self.near_bh_frames = 0
        self.trail = []
        self.max_trail_len = 90

        self.max_speed = 12.0
        self.max_steer_speed = 5.0
        self.max_thrust = 0.16
        self.fuel_burn_rate = 1.5

        self.sensor_angles = [-60, -30, 0, 30, 60]
        self.sensor_range = 250.0
        self.sensor_readings = [0.0] * len(self.sensor_angles)
        self.sensor_hit_points = [None] * len(self.sensor_angles)

        self.base_color = pygame.Color(0, 220, 100)
        self.color = pygame.Color(0, 220, 100)

    def update_physics(self, bh_pos, mass_bh, g_const, rs, c_speed, screen_width, screen_height):
        if self.is_dying:
            self.death_timer -= 1
            if self.death_timer <= 0:
                self.is_alive = False
                self.is_dying = False
                return

            diff = pygame.Vector2(bh_pos) - self.pos
            self.angle = (self.angle + 18.0) % 360
            self.pos += diff * 0.12

            self.trail.append(pygame.Vector2(self.pos))
            if len(self.trail) > self.max_trail_len:
                self.trail.pop(0)
            return

        if not self.is_alive:
            return

        gravity_acc = physics.calculate_gravity(
            np.array(self.pos),
            np.array(bh_pos),
            mass_bh,
            g_const,
            min_dist=rs * 0.5
        )
        self.acc += pygame.Vector2(float(gravity_acc[0]), float(gravity_acc[1]))

        self.vel += self.acc

        speed = self.vel.length()
        if speed > self.max_speed:
            self.vel = self.vel.normalize() * self.max_speed
            speed = self.max_speed

        self.pos += self.vel
        self.acc = pygame.Vector2(0, 0)

        self.trail.append(pygame.Vector2(self.pos))
        if len(self.trail) > self.max_trail_len:
            self.trail.pop(0)

        if self.vel.length_squared() > 0.01:
            self.angle = pygame.Vector2(1, 0).angle_to(self.vel)

        dist_to_bh = self.pos.distance_to(bh_pos)
        self.survival_time += 1.0

        dt_factor = physics.calculate_time_dilation(dist_to_bh, speed, rs, c_speed)
        self.proper_time += dt_factor

        if dist_to_bh < self.min_distance_to_bh:
            self.min_distance_to_bh = dist_to_bh

        if rs * 1.2 < dist_to_bh < rs * 2.8:
            self.near_bh_frames += 1
            if speed > self.max_speed_near_bh:
                self.max_speed_near_bh = speed

        # Redshift color: green → red as probe approaches the horizon
        redshift_start = rs * 2.5
        if dist_to_bh <= rs:
            self.color = pygame.Color(180, 0, 0)
        elif dist_to_bh < redshift_start:
            ratio = (dist_to_bh - rs) / (redshift_start - rs)
            ratio = max(0.0, min(1.0, ratio))
            r = int(220 * (1.0 - ratio))
            g = int(220 * ratio)
            b = int(100 * ratio)
            self.color = pygame.Color(r, g, b)
        else:
            self.color = self.base_color

        if dist_to_bh < rs:
            self.is_dying = True
            self.death_timer = self.death_max_timer
            self.death_reason = "absorbed"
        elif (self.pos.x < -100 or self.pos.x > screen_width + 100 or
              self.pos.y < -100 or self.pos.y > screen_height + 100):
            self.is_alive = False
            self.death_reason = "crashed"

    def run_sensors(self, bh_pos, rs, screen_width, screen_height):
        if not self.is_alive:
            return

        for i, angle_offset in enumerate(self.sensor_angles):
            ray_angle = self.angle + angle_offset
            rad = np.radians(ray_angle)
            ray_dir = pygame.Vector2(np.cos(rad), np.sin(rad)).normalize()

            hit_dist = self.sensor_range
            hit_point = self.pos + ray_dir * self.sensor_range

            # Circle intersection with event horizon
            v = self.pos - bh_pos
            b = 2.0 * v.dot(ray_dir)
            c = v.dot(v) - rs * rs

            disc = b * b - 4.0 * c
            if disc >= 0:
                t1 = (-b - np.sqrt(disc)) / 2.0
                t2 = (-b + np.sqrt(disc)) / 2.0

                t_hits = [t for t in [t1, t2] if t > 0]
                if t_hits:
                    t_circle = min(t_hits)
                    if t_circle < hit_dist:
                        hit_dist = t_circle
                        hit_point = self.pos + ray_dir * hit_dist

            # Screen border intersections
            if ray_dir.x < 0:
                t = -self.pos.x / ray_dir.x
                if 0 < t < hit_dist:
                    hit_dist = t
                    hit_point = self.pos + ray_dir * hit_dist
            elif ray_dir.x > 0:
                t = (screen_width - self.pos.x) / ray_dir.x
                if 0 < t < hit_dist:
                    hit_dist = t
                    hit_point = self.pos + ray_dir * hit_dist

            if ray_dir.y < 0:
                t = -self.pos.y / ray_dir.y
                if 0 < t < hit_dist:
                    hit_dist = t
                    hit_point = self.pos + ray_dir * hit_dist
            elif ray_dir.y > 0:
                t = (screen_height - self.pos.y) / ray_dir.y
                if 0 < t < hit_dist:
                    hit_dist = t
                    hit_point = self.pos + ray_dir * hit_dist

            self.sensor_readings[i] = 1.0 - (hit_dist / self.sensor_range)
            self.sensor_hit_points[i] = hit_point

    def think_and_control(self, next_target_pos):
        if not self.is_alive:
            return

        speed_norm = self.vel.length() / self.max_speed

        target_vec = pygame.Vector2(next_target_pos) - self.pos
        target_dist = target_vec.length()
        target_dist_norm = 1.0 / (1.0 + target_dist * 0.005)

        if target_dist > 0.01:
            target_angle = pygame.Vector2(1, 0).angle_to(target_vec)
            angle_diff = (target_angle - self.angle) % 360
            if angle_diff > 180:
                angle_diff -= 360
            angle_diff_norm = angle_diff / 180.0
        else:
            angle_diff_norm = 0.0

        inputs = [
            self.sensor_readings[0],
            self.sensor_readings[1],
            self.sensor_readings[2],
            self.sensor_readings[3],
            self.sensor_readings[4],
            speed_norm,
            target_dist_norm,
            angle_diff_norm
        ]

        outputs = self.brain.forward(inputs)

        steer_out = outputs[0]
        thrust_out = outputs[1]

        self.angle += steer_out * self.max_steer_speed
        self.angle %= 360

        if thrust_out > 0.0 and self.fuel > 0.0:
            rad = np.radians(self.angle)
            heading = pygame.Vector2(np.cos(rad), np.sin(rad))

            thrust_strength = thrust_out * self.max_thrust
            self.acc += heading * thrust_strength

            self.fuel -= thrust_out * self.fuel_burn_rate
            if self.fuel < 0.0:
                self.fuel = 0.0

    def draw(self, surface, draw_sensors=True, bh_pos=None):
        if not self.is_alive and not self.is_dying:
            return

        trail_fade = (self.death_timer / self.death_max_timer) if self.is_dying else 1.0

        if len(self.trail) > 1:
            for k in range(len(self.trail) - 1):
                p1 = self.trail[k]
                p2 = self.trail[k + 1]
                alpha = int(255 * (k / len(self.trail)) * trail_fade)
                color = pygame.Color(self.color.r, self.color.g, self.color.b, alpha)
                pygame.draw.line(surface, color, p1, p2, 1)

        if draw_sensors and not self.is_dying:
            for hit_pt in self.sensor_hit_points:
                if hit_pt is not None:
                    pygame.draw.line(surface, pygame.Color(200, 50, 50, 60), self.pos, hit_pt, 1)
                    pygame.draw.circle(surface, pygame.Color(200, 50, 50, 120), (int(hit_pt.x), int(hit_pt.y)), 2)

        # Spaghettification: stretch along fall axis, squeeze width
        if self.is_dying:
            progress = 1.0 - (self.death_timer / self.death_max_timer)
            scale_long = 1.0 + 3.5 * progress
            scale_trans = 1.0 - 0.75 * progress
            alpha = int(255 * (self.death_timer / self.death_max_timer))
        else:
            scale_long = 1.0
            scale_trans = 1.0
            alpha = 255

        rad = np.radians(self.angle)
        heading = pygame.Vector2(np.cos(rad), np.sin(rad))
        right = pygame.Vector2(-heading.y, heading.x)

        nose = self.pos + heading * (10 * scale_long)
        left_wing = self.pos - heading * (6 * scale_long) - right * (5 * scale_trans)
        right_wing = self.pos - heading * (6 * scale_long) + right * (5 * scale_trans)

        body_color = pygame.Color(self.color.r, self.color.g, self.color.b, alpha)
        outline_color = pygame.Color(255, 255, 255, int(180 * (alpha / 255)))

        pygame.draw.polygon(surface, body_color, [nose, left_wing, right_wing])
        pygame.draw.polygon(surface, outline_color, [nose, left_wing, right_wing], 1)

        if self.fuel > 0.0 and not self.is_dying and self.brain.last_outputs[0, 1] > 0.1:
            flame_tip = self.pos - heading * (10 + np.random.randint(2, 8))
            flame_left = self.pos - heading * 6 - right * 2
            flame_right = self.pos - heading * 6 + right * 2
            pygame.draw.polygon(surface, pygame.Color(255, 120, 0), [flame_tip, flame_left, flame_right])
