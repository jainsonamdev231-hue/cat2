const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Make canvas responsive to window size
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- UTILITIES & PHYSICS ---
const gravity = 1500; // pixels per second squared

// Particle System for explosions and trails
class Particle {
    constructor(x, y, color, speed, size, life) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        this.color = color;
        this.size = Math.random() * size + 2;
        this.life = life;
        this.maxLife = life;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

// --- GAME ENGINE ---
class AnimationEngine {
    constructor() {
        this.state = 'WALKING'; // WALKING, CRASH, FLYING, FIGHTING, DEFEATED
        this.timeInState = 0;
        this.particles = [];
        this.screenShake = 0;
        
        // World coordinates
        this.groundY = canvas.height - 150;
        
        // Entities
        this.cat = { x: 100, y: this.groundY, size: 60, emoji: '🐈', vx: 150, vy: 0, angle: 0 };
        this.car = { x: canvas.width + 100, y: this.groundY - 10, size: 100, emoji: '🚗', vx: -500 };
        this.human = { x: canvas.width - 200, y: 150, size: 70, emoji: '🥷', active: false };
        
        this.lastTime = performance.now();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    spawnParticles(x, y, color, count, speed, size, life) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, speed, size, life));
        }
    }

    drawEmoji(emoji, x, y, size, angle = 0, scaleX = 1, scaleY = 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scaleX, scaleY);
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
    }

    drawEnvironment(dt) {
        // Sky Gradient
        let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a2a6c');
        gradient.addColorStop(0.5, '#b21f1f');
        gradient.addColorStop(1, '#fdbb2d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground
        ctx.fillStyle = '#222';
        ctx.fillRect(0, this.groundY + 30, canvas.width, canvas.height - this.groundY);
        
        // Road dashed lines (Parallax effect)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 10;
        ctx.setLineDash([40, 40]);
        ctx.lineDashOffset = -(performance.now() / 5) % 80; 
        ctx.beginPath();
        ctx.moveTo(0, this.groundY + 80);
        ctx.lineTo(canvas.width, this.groundY + 80);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawSpeechBubble(x, y, text) {
        ctx.save();
        ctx.translate(x, y);
        
        let bob = Math.sin(performance.now() / 150) * 5;
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(-150, -60 + bob, 300, 60, 20);
        ctx.fill();
        
        // Tail of bubble
        ctx.beginPath();
        ctx.moveTo(0, bob);
        ctx.lineTo(-20, -10 + bob);
        ctx.lineTo(20, -10 + bob);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, -30 + bob);
        ctx.restore();
    }

    updateAndDraw(dt) {
        this.timeInState += dt;
        
        if (this.screenShake > 0) {
            ctx.save();
            let dx = (Math.random() - 0.5) * this.screenShake;
            let dy = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(dx, dy);
            this.screenShake -= dt * 100;
        }

        this.drawEnvironment(dt);

        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            p.update(dt);
            p.draw(ctx);
        });
        
        if (this.state === 'WALKING') {
            this.cat.x += this.cat.vx * dt;
            let catBob = Math.sin(this.timeInState * 15) * 5;
            this.car.x += this.car.vx * dt;

            this.drawEmoji(this.cat.emoji, this.cat.x, this.cat.y + catBob, this.cat.size);
            this.drawEmoji(this.car.emoji, this.car.x, this.car.y, this.car.size);

            if (Math.abs(this.cat.x - this.car.x) < 70) {
                this.state = 'CRASH';
                this.timeInState = 0;
                this.screenShake = 50;
                this.spawnParticles(this.cat.x, this.cat.y, '#ff4400', 50, 800, 8, 1.5);
                this.spawnParticles(this.cat.x, this.cat.y, '#888', 30, 400, 10, 2);
                this.cat.emoji = '😿';
                this.cat.angle = -Math.PI / 4;
            }
        } 
        else if (this.state === 'CRASH') {
            this.car.x += this.car.vx * dt;
            if (this.timeInState < 1) {
                this.cat.x -= 100 * dt;
                this.cat.angle -= 5 * dt;
            }

            this.drawEmoji(this.cat.emoji, this.cat.x, this.cat.y, this.cat.size, this.cat.angle);
            this.drawEmoji(this.car.emoji, this.car.x, this.car.y, this.car.size);

            if (this.timeInState > 2.5) {
                this.state = 'FLYING';
                this.timeInState = 0;
                this.cat.emoji = '🦸‍♂️';
                this.cat.angle = 0;
                this.human.active = true;
            }
        }
        else if (this.state === 'FLYING') {
            this.cat.y -= 250 * dt;
            this.cat.x += 150 * dt;
            if (Math.random() < 0.5) {
                this.spawnParticles(this.cat.x - 20, this.cat.y + 20, '#fff', 1, 50, 5, 0.5);
            }

            this.drawEmoji(this.cat.emoji, this.cat.x, this.cat.y, this.cat.size);
            this.drawEmoji(this.human.emoji, this.human.x, this.human.y, this.human.size);

            if (Math.abs(this.cat.x - this.human.x) < 80 && Math.abs(this.cat.y - this.human.y) < 80) {
                this.state = 'FIGHTING';
                this.timeInState = 0;
            }
        }
        else if (this.state === 'FIGHTING') {
            this.screenShake = 10;
            let pX = this.human.x - 40 + (Math.random() * 80);
            let pY = this.human.y - 40 + (Math.random() * 80);
            
            if (Math.random() < 0.2) {
                this.spawnParticles(pX, pY, '#ffcc00', 5, 300, 4, 0.2);
            }

            this.drawEmoji(this.cat.emoji, pX - 20, pY, this.cat.size);
            this.drawEmoji(this.human.emoji, pX + 20, pY, this.human.size);

            if (this.timeInState > 3) {
                this.state = 'DEFEATED';
                this.timeInState = 0;
                this.cat.emoji = '🤕';
                this.cat.vy = -500;
                this.cat.vx = -200;
                this.screenShake = 30;
            }
        }
        else if (this.state === 'DEFEATED') {
            this.cat.vy += gravity * dt;
            this.cat.y += this.cat.vy * dt;
            this.cat.x += this.cat.vx * dt;
            this.cat.angle -= 10 * dt;

            if (this.cat.y >= this.groundY) {
                this.cat.y = this.groundY;
                if (Math.abs(this.cat.vy) > 100) {
                    this.cat.vy *= -0.4;
                    this.cat.vx *= 0.5;
                    this.spawnParticles(this.cat.x, this.groundY + 20, '#555', 10, 100, 4, 0.5);
                } else {
                    this.cat.vy = 0;
                    this.cat.vx = 0;
                    this.cat.angle = 0;
                }
            }

            this.drawEmoji(this.human.emoji, this.human.x, this.human.y, this.human.size);
            this.drawEmoji(this.cat.emoji, this.cat.x, this.cat.y, this.cat.size, this.cat.angle);

            if (this.cat.y === this.groundY && this.cat.vx === 0 && this.timeInState > 1.5) {
                this.drawSpeechBubble(this.cat.x, this.cat.y - 60, "Meowwwwwwww! 😭");
            }
        }

        if (this.screenShake > 0) ctx.restore();
    }

    loop(currentTime) {
        let dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        if (dt > 0.1) dt = 0.1;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.updateAndDraw(dt);

        requestAnimationFrame(this.loop);
    }
}

// Start the animation
new AnimationEngine();
