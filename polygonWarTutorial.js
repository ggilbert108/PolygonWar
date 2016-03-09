(function (globals) {
    "use strict";

    Bridge.define('PolygonWarTutorial.Action');
    
    Bridge.define('PolygonWarTutorial.Component', {
        config: {
            properties: {
                Name: null
            }
        },
        constructor: function (name) {
            this.setName(name);
        }
    });
    
    Bridge.define('PolygonWarTutorial.System', {
        requiredComponents: null,
        registeredEntities: null,
        manager: null,
        constructor: function () {
            this.requiredComponents = new Bridge.List$1(String)();
            this.registeredEntities = new Bridge.Dictionary$2(Bridge.Int,PolygonWarTutorial.Entity)();
        },
        bindManager: function (manager) {
            this.manager = manager;
        },
        addRequiredComponent: function (required) {
            this.requiredComponents.add(required);
        },
        deleteEntity: function (id) {
            this.registeredEntities.remove(id);
        },
        updateRegistration: function (entity) {
            var isRegistered = this.registeredEntities.containsKey(entity.getId());
            var matches = this.matchesComponents(entity);
            if (isRegistered) {
                if (!matches) {
                    this.registeredEntities.remove(entity.getId());
                }
            }
            else  {
                if (matches) {
                    this.registeredEntities.set(entity.getId(), entity);
                }
            }
        },
        matchesComponents: function (entity) {
            var $t;
            var matches = true;
            $t = Bridge.getEnumerator(this.requiredComponents);
            while ($t.moveNext()) {
                var required = $t.getCurrent();
                if (!entity.hasComponent(required)) {
                    matches = false;
                    break;
                }
            }
            return matches;
        }
    });
    
    Bridge.define('PolygonWarTutorial.App', {
        statics: {
            PROJECTILE_SIZE: 5,
            HERO_PROJECTILE_SPEED: 2000,
            ENEMY_PROJECTILE_SPEED: 300,
            PROJECTILE_LIFETIME: 1,
            PROJECTILE_DAMAGE: 50,
            LEVEL_SIZE: 5000,
            ENEMY_SIGHT_RADIUS: 500,
            ENEMY_STAY_BACK_RADIUS: 150,
            ENEMY_STAY_BACK_VARIANCE: 200,
            ENEMY_SHOT_RECHARGE: 0.8,
            STRAFE_SWITCH_CHANCE: 0.01,
            context: null,
            keysDown: null,
            mouseClick: null,
            heroCam: null,
            kills: 0,
            config: {
                init: function () {
                    Bridge.ready(this.main);
                }
            },
            main: function () {
                var canvas = document.getElementById("canvas");
                Bridge.get(PolygonWarTutorial.App).context = canvas.getContext("2d");
                //For consistency, go ahead and set the stroke width
                Bridge.get(PolygonWarTutorial.App).context.lineWidth = 2;
                Bridge.get(PolygonWarTutorial.App).context.font = "30px Arial";
                Bridge.get(PolygonWarTutorial.App).keysDown = Bridge.Array.init(255, false);
                Bridge.get(PolygonWarTutorial.App).mouseClick = null;
                Bridge.get(PolygonWarTutorial.App).heroCam = null;
                Bridge.get(PolygonWarTutorial.App).kills = 0;
    
                //Create the manager and add the rendering system
                var manager = new PolygonWarTutorial.Manager();
                manager.addSystem(new PolygonWarTutorial.RenderSystem());
                manager.addSystem(new PolygonWarTutorial.ActionSystem());
                manager.addSystem(new PolygonWarTutorial.GarbageSystem());
                manager.addSystem(new PolygonWarTutorial.MovementSystem());
                manager.addSystem(new PolygonWarTutorial.CollisionSystem());
                manager.addSystem(new PolygonWarTutorial.CameraSystem());
    
                //Create an entity and add shape and position components
                var hero = manager.addAndGetEntity();
                hero.addActorAssemblage(manager, 1000, 1000, "circle", 25, "red", false, true, 500, 500);
    
                for (var i = 0; i < 200; i++) {
                    var randomX = Math.random() * Bridge.get(PolygonWarTutorial.App).LEVEL_SIZE + 1000;
                    var randomY = Math.random() * Bridge.get(PolygonWarTutorial.App).LEVEL_SIZE + 1000;
                    var enemy = manager.addAndGetEntity();
                    enemy.addActorAssemblage(manager, randomX, randomY, "triangle", 25, "green", false, false, 400, 200);
                }
    
                //Every 10 milliseconds, update the systems
                window.setInterval(function () {
                    Bridge.get(PolygonWarTutorial.App).context.clearRect(0, 0, 800, 680);
    
                    Bridge.get(PolygonWarTutorial.App).drawGrid();
                    Bridge.get(PolygonWarTutorial.App).context.fillStyle = "black";
                    Bridge.get(PolygonWarTutorial.App).context.fillText("Kills: " + Bridge.get(PolygonWarTutorial.App).kills + "/200", 0, 30);
    
                    manager.updateSystems(0.01);
                }, 10);
    
                document.onkeydown = $_.PolygonWarTutorial.App.f1;
                document.onkeyup = $_.PolygonWarTutorial.App.f2;
                document.onclick = function (mouseEvent) {
                    Bridge.get(PolygonWarTutorial.App).mouseClick = Bridge.get(PolygonWarTutorial.App).getCursorPosition(canvas, mouseEvent);
                };
            },
            getCursorPosition: function (canvas, mouseEvent) {
                var rect = canvas.getBoundingClientRect();
                var x = mouseEvent.clientX - rect.left;
                var y = mouseEvent.clientY - rect.top;
                x += Bridge.get(PolygonWarTutorial.App).heroCam.x1;
                y += Bridge.get(PolygonWarTutorial.App).heroCam.y1;
                return new PolygonWarTutorial.Vector(x, y);
            },
            isInCamera: function (positionComponent) {
                if (!Bridge.hasValue(Bridge.get(PolygonWarTutorial.App).heroCam)) {
                    return true;
                }
                var position = positionComponent.position;
                return position.x >= Bridge.get(PolygonWarTutorial.App).heroCam.x1 && position.y >= Bridge.get(PolygonWarTutorial.App).heroCam.y1 && position.x <= Bridge.get(PolygonWarTutorial.App).heroCam.getX2() && position.y <= Bridge.get(PolygonWarTutorial.App).heroCam.getY2();
            },
            drawGrid: function () {
                if (Bridge.hasValue(Bridge.get(PolygonWarTutorial.App).heroCam)) {
                    var gridWidth = 50;
                    var startX = gridWidth - Bridge.get(PolygonWarTutorial.App).heroCam.x1 % gridWidth;
                    var startY = gridWidth - Bridge.get(PolygonWarTutorial.App).heroCam.y1 % gridWidth;
                    for (var x = startX; x < 800; x += gridWidth) {
                        Bridge.get(PolygonWarTutorial.App).context.beginPath();
                        Bridge.get(PolygonWarTutorial.App).context.moveTo(x, 0);
                        Bridge.get(PolygonWarTutorial.App).context.lineTo(x, 680);
                        if (x + Bridge.get(PolygonWarTutorial.App).heroCam.x1 >= Bridge.get(PolygonWarTutorial.App).LEVEL_SIZE || x + Bridge.get(PolygonWarTutorial.App).heroCam.x1 <= 0) {
                            Bridge.get(PolygonWarTutorial.App).context.lineWidth = 4;
                            Bridge.get(PolygonWarTutorial.App).context.strokeStyle = "red";
                        }
                        else  {
                            Bridge.get(PolygonWarTutorial.App).context.lineWidth = 2;
                            Bridge.get(PolygonWarTutorial.App).context.strokeStyle = "black";
                        }
    
                        Bridge.get(PolygonWarTutorial.App).context.stroke();
                        Bridge.get(PolygonWarTutorial.App).context.closePath();
                    }
                    for (var y = startY; y < 680; y += gridWidth) {
                        Bridge.get(PolygonWarTutorial.App).context.beginPath();
                        Bridge.get(PolygonWarTutorial.App).context.moveTo(0, y);
                        Bridge.get(PolygonWarTutorial.App).context.lineTo(800, y);
                        if (y + Bridge.get(PolygonWarTutorial.App).heroCam.y1 >= Bridge.get(PolygonWarTutorial.App).LEVEL_SIZE || y + Bridge.get(PolygonWarTutorial.App).heroCam.y1 <= 0) {
                            Bridge.get(PolygonWarTutorial.App).context.lineWidth = 4;
                            Bridge.get(PolygonWarTutorial.App).context.strokeStyle = "red";
                        }
                        else  {
                            Bridge.get(PolygonWarTutorial.App).context.lineWidth = 2;
                            Bridge.get(PolygonWarTutorial.App).context.strokeStyle = "black";
                        }
    
                        Bridge.get(PolygonWarTutorial.App).context.stroke();
                        Bridge.get(PolygonWarTutorial.App).context.closePath();
                    }
                    Bridge.get(PolygonWarTutorial.App).context.lineWidth = 2;
                    Bridge.get(PolygonWarTutorial.App).context.strokeStyle = "black";
                }
            }
        }
    });
    
    var $_ = {};
    
    Bridge.ns("PolygonWarTutorial.App", $_)
    
    Bridge.apply($_.PolygonWarTutorial.App, {
        f1: function (keyEvent) {
            Bridge.get(PolygonWarTutorial.App).keysDown[keyEvent.keyCode] = true;
        },
        f2: function (keyEvent) {
            Bridge.get(PolygonWarTutorial.App).keysDown[keyEvent.keyCode] = false;
        }
    });
    
    Bridge.define('PolygonWarTutorial.Entity', {
        components: null,
        config: {
            properties: {
                Id: 0
            }
        },
        constructor: function (id) {
            this.setId(id);
            this.components = new Bridge.Dictionary$2(String,PolygonWarTutorial.Component)();
        },
        addComponent: function (component) {
            this.components.set(component.getName(), component);
        },
        removeComponent: function (name) {
            this.components.remove(name);
        },
        hasComponent: function (name) {
            return this.components.containsKey(name);
        },
        getComponent: function (name) {
            return this.components.get(name);
        },
        addActorAssemblage: function (manager, x, y, shapeType, radius, color, hollow, fromInput, speed, health) {
            manager.addComponentToEntity(this, new PolygonWarTutorial.PositionComponent(new PolygonWarTutorial.Vector(x, y)));
            manager.addComponentToEntity(this, new PolygonWarTutorial.ShapeComponent(shapeType, radius, color, hollow));
            manager.addComponentToEntity(this, new PolygonWarTutorial.ActionComponent(fromInput));
            manager.addComponentToEntity(this, new PolygonWarTutorial.SpeedComponent(speed));
            manager.addComponentToEntity(this, new PolygonWarTutorial.CollisionComponent(-1));
            manager.addComponentToEntity(this, new PolygonWarTutorial.HealthComponent(health));
    
            if (fromInput) {
                manager.addComponentToEntity(this, new PolygonWarTutorial.CameraComponent(Bridge.Int.trunc(x), Bridge.Int.trunc(y)));
            }
            else  {
                var stayBack = Bridge.get(PolygonWarTutorial.App).ENEMY_STAY_BACK_RADIUS;
                var vary = Bridge.Int.trunc((Math.random() * Bridge.get(PolygonWarTutorial.App).ENEMY_STAY_BACK_VARIANCE));
                stayBack += vary;
    
    
                manager.addComponentToEntity(this, new PolygonWarTutorial.AiComponent(Bridge.get(PolygonWarTutorial.App).ENEMY_SIGHT_RADIUS, stayBack, Bridge.get(PolygonWarTutorial.App).ENEMY_SHOT_RECHARGE));
                //Enemies are always triangles, and always start facing upwards
                manager.addComponentToEntity(this, new PolygonWarTutorial.FacingComponent(new PolygonWarTutorial.Vector(0, -1)));
            }
        },
        addProjectileAssemblage: function (manager, x, y, dx, dy, speed, sourceId, damage) {
            manager.addComponentToEntity(this, new PolygonWarTutorial.PositionComponent(new PolygonWarTutorial.Vector(x, y)));
            manager.addComponentToEntity(this, new PolygonWarTutorial.ShapeComponent("circle", Bridge.get(PolygonWarTutorial.App).PROJECTILE_SIZE, "red", false));
            manager.addComponentToEntity(this, new PolygonWarTutorial.DirectionComponent(new PolygonWarTutorial.Vector(dx, dy)));
            manager.addComponentToEntity(this, new PolygonWarTutorial.SpeedComponent(speed));
            manager.addComponentToEntity(this, new PolygonWarTutorial.LifetimeComponent(Bridge.get(PolygonWarTutorial.App).PROJECTILE_LIFETIME));
            manager.addComponentToEntity(this, new PolygonWarTutorial.CollisionComponent(sourceId));
            manager.addComponentToEntity(this, new PolygonWarTutorial.DamageComponent(damage));
        }
    });
    
    Bridge.define('PolygonWarTutorial.Manager', {
        nextEntityId: 0,
        entities: null,
        systems: null,
        constructor: function () {
            this.nextEntityId = 0;
            this.entities = new Bridge.Dictionary$2(Bridge.Int,PolygonWarTutorial.Entity)();
            this.systems = new Bridge.List$1(PolygonWarTutorial.System)();
        },
        addAndGetEntity: function () {
            var entity = new PolygonWarTutorial.Entity(this.nextEntityId++);
            this.entities.set(entity.getId(), entity);
            return entity;
        },
        getEntityById: function (id) {
            return this.entities.get(id);
        },
        removeEntity: function (id) {
            var $t;
            this.entities.remove(id);
            $t = Bridge.getEnumerator(this.systems);
            while ($t.moveNext()) {
                var system = $t.getCurrent();
                system.deleteEntity(id);
            }
        },
        addComponentToEntity: function (entity, component) {
            entity.addComponent(component);
            this.updateEntityRegistration(entity);
        },
        removeComponentFromEntity: function (entity, componentName) {
            entity.removeComponent(componentName);
            this.updateEntityRegistration(entity);
        },
        addSystem: function (system) {
            this.systems.add(system);
            system.bindManager(this);
        },
        updateEntityRegistration: function (entity) {
            var $t;
            $t = Bridge.getEnumerator(this.systems);
            while ($t.moveNext()) {
                var system = $t.getCurrent();
                system.updateRegistration(entity);
            }
        },
        updateSystems: function (dt) {
            var $t;
            $t = Bridge.getEnumerator(this.systems);
            while ($t.moveNext()) {
                var system = $t.getCurrent();
                system.update(dt);
            }
        }
    });
    
    Bridge.define('PolygonWarTutorial.Vector', {
        statics: {
            dot: function (a, b) {
                return a.x * b.x + a.y * b.y;
            },
            angleBetween: function (a, b) {
                var cosTheta = Bridge.get(PolygonWarTutorial.Vector).dot(a, b) / (a.length() * b.length());
                return Math.acos(cosTheta);
            },
            op_Addition: function (a, b) {
                return new PolygonWarTutorial.Vector(a.x + b.x, a.y + b.y);
            },
            op_Subtraction: function (a, b) {
                return new PolygonWarTutorial.Vector(a.x - b.x, a.y - b.y);
            },
            op_Multiply: function (a, k) {
                return new PolygonWarTutorial.Vector(a.x * k, a.y * k);
            },
            op_Division: function (a, k) {
                return new PolygonWarTutorial.Vector(a.x / k, a.y / k);
            }
        },
        x: 0,
        y: 0,
        constructor: function (x, y) {
            this.x = x;
            this.y = y;
        },
        rotate: function (theta) {
            var newX = this.x * Math.cos(theta) - this.y * Math.sin(theta);
            var newY = this.x * Math.sin(theta) + this.y * Math.cos(theta);
            this.x = newX;
            this.y = newY;
        },
        normalize: function () {
            var length = this.length();
            this.x /= length;
            this.y /= length;
        },
        length: function () {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        },
        clone: function () {
            var result = new PolygonWarTutorial.Vector(this.x + 1, this.y + 1);
            result.x -= 1;
            result.y -= 1;
            return result;
        }
    });
    
    Bridge.define('PolygonWarTutorial.ActionComponent', {
        inherits: [PolygonWarTutorial.Component],
        actions: null,
        fromInput: false,
        constructor: function (fromInput) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "action");
    
            this.actions = new Bridge.List$1(PolygonWarTutorial.Action)();
            this.fromInput = fromInput;
        }
    });
    
    Bridge.define('PolygonWarTutorial.ActionSystem', {
        inherits: [PolygonWarTutorial.System],
        aiTarget: null,
        constructor: function () {
            PolygonWarTutorial.System.prototype.$constructor.call(this);
    
            this.addRequiredComponent("action");
        },
        update: function (deltaTime) {
            var $t, $t1;
            $t = Bridge.getEnumerator(this.registeredEntities.getValues());
            while ($t.moveNext()) {
                var entity = $t.getCurrent();
                var actionComponent = Bridge.cast(entity.getComponent("action"), PolygonWarTutorial.ActionComponent);
    
                var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
                if (!Bridge.get(PolygonWarTutorial.App).isInCamera(positionComponent)) {
                    continue;
                }
    
    
    
                if (actionComponent.fromInput) {
                    this.getActionFromInput(entity, deltaTime);
                }
                else  {
                    this.getActionFromAi(entity, deltaTime);
                }
    
                $t1 = Bridge.getEnumerator(actionComponent.actions);
                while ($t1.moveNext()) {
                    var action = $t1.getCurrent();
                    action.doAction(entity);
                }
                actionComponent.actions.clear();
            }
        },
        getActionFromInput: function (entity, deltaTime) {
            var actionComponent = Bridge.cast(entity.getComponent("action"), PolygonWarTutorial.ActionComponent);
    
            this.getActionFromKeyboard(actionComponent, deltaTime);
            this.getActionFromMouse(actionComponent);
    
            var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
            this.aiTarget = positionComponent.position;
        },
        getActionFromKeyboard: function (actionComponent, deltaTime) {
            var moveVector = new PolygonWarTutorial.Vector(0, 0);
            if (Bridge.get(PolygonWarTutorial.App).keysDown[87]) {
                moveVector.y -= 1;
            }
            if (Bridge.get(PolygonWarTutorial.App).keysDown[65]) {
                moveVector.x -= 1;
            }
            if (Bridge.get(PolygonWarTutorial.App).keysDown[83]) {
                moveVector.y += 1;
            }
            if (Bridge.get(PolygonWarTutorial.App).keysDown[68]) {
                moveVector.x += 1;
            }
    
            if (Math.abs(moveVector.x) > 0.001 || Math.abs(moveVector.y) > 0.001) {
                actionComponent.actions.add(new PolygonWarTutorial.MoveInDirection(moveVector, deltaTime));
            }
        },
        getActionFromMouse: function (actionComponent) {
            if (Bridge.hasValue(Bridge.get(PolygonWarTutorial.App).mouseClick)) {
                actionComponent.actions.add(new PolygonWarTutorial.SpawnProjectile(Bridge.get(PolygonWarTutorial.App).mouseClick, this.manager));
                Bridge.get(PolygonWarTutorial.App).mouseClick = null;
            }
        },
        getActionFromAi: function (entity, deltaTime) {
            var actionComponent = Bridge.cast(entity.getComponent("action"), PolygonWarTutorial.ActionComponent);
            var aiComponent = Bridge.cast(entity.getComponent("ai"), PolygonWarTutorial.AiComponent);
            if (Bridge.hasValue(this.aiTarget)) {
                var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
                var facing = Bridge.cast(entity.getComponent("facing"), PolygonWarTutorial.FacingComponent);
    
    
                var between = PolygonWarTutorial.Vector.op_Subtraction(this.aiTarget, positionComponent.position);
                var length = between.length();
    
                var inSightRange = true;
                var threshold = 20;
                if (length < aiComponent.stayBackRadius - 20) {
                    var backup = PolygonWarTutorial.Vector.op_Multiply(facing.direction, -1);
                    actionComponent.actions.add(new PolygonWarTutorial.MoveInDirection(backup, deltaTime));
    
                }
                else  {
                    if (Math.abs(length - aiComponent.stayBackRadius) < threshold) {
                        var strafe = facing.direction.clone();
                        strafe.rotate(Math.PI / 2);
    
                        strafe = PolygonWarTutorial.Vector.op_Multiply(strafe, aiComponent.strafeDirection);
                        actionComponent.actions.add(new PolygonWarTutorial.MoveInDirection(strafe, deltaTime));
                    }
                    else  {
                        if (length < aiComponent.sightRadius) {
                            actionComponent.actions.add(new PolygonWarTutorial.MoveInDirection(between, deltaTime));
                        }
                        else  {
                            inSightRange = false;
                        }
                    }
                }
    
                if (inSightRange) {
    
                    facing.direction = PolygonWarTutorial.Vector.op_Addition(facing.direction, between);
                    facing.direction.normalize();
    
                    aiComponent.currentTime += deltaTime;
                    if (aiComponent.currentTime > aiComponent.shotRechargeTime) {
                        aiComponent.currentTime -= aiComponent.shotRechargeTime;
                        var forward = facing.direction.clone();
                        forward.rotate(Math.PI / 2);
                        actionComponent.actions.add(new PolygonWarTutorial.SpawnProjectile(this.aiTarget, this.manager));
                    }
                }
            }
    
            if (Math.random() < Bridge.get(PolygonWarTutorial.App).STRAFE_SWITCH_CHANCE) {
                aiComponent.strafeDirection *= -1;
            }
        }
    });
    
    Bridge.define('PolygonWarTutorial.AiComponent', {
        inherits: [PolygonWarTutorial.Component],
        sightRadius: 0,
        stayBackRadius: 0,
        shotRechargeTime: 0,
        currentTime: 0,
        strafeDirection: 0,
        constructor: function (sightRadius, stayBackRadius, shotRechargeTime) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "ai");
    
            this.sightRadius = sightRadius;
            this.stayBackRadius = stayBackRadius;
            this.shotRechargeTime = shotRechargeTime;
            this.strafeDirection = 1;
        }
    });
    
    Bridge.define('PolygonWarTutorial.CameraComponent', {
        inherits: [PolygonWarTutorial.Component],
        statics: {
            WIDTH: 800,
            HEIGHT: 680
        },
        x1: 0,
        y1: 0,
        constructor: function (targetX, targetY) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "camera");
    
            this.set(targetX, targetY);
        },
        getX2: function () {
            return this.x1 + Bridge.get(PolygonWarTutorial.CameraComponent).WIDTH;
        },
        getY2: function () {
            return this.y1 + Bridge.get(PolygonWarTutorial.CameraComponent).HEIGHT;
        },
        set: function (targetX, targetY) {
            this.x1 = targetX - 400;
            this.y1 = targetY - 340;
        }
    });
    
    Bridge.define('PolygonWarTutorial.CameraSystem', {
        inherits: [PolygonWarTutorial.System],
        constructor: function () {
            PolygonWarTutorial.System.prototype.$constructor.call(this);
    
            this.addRequiredComponent("camera");
            this.addRequiredComponent("position");
        },
        update: function (deltaTime) {
            var $t;
            $t = Bridge.getEnumerator(this.registeredEntities.getValues());
            while ($t.moveNext()) {
                var entity = $t.getCurrent();
                var cameraComponent = Bridge.cast(entity.getComponent("camera"), PolygonWarTutorial.CameraComponent);
                var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
    
                cameraComponent.set(Bridge.Int.trunc(positionComponent.position.x), Bridge.Int.trunc(positionComponent.position.y));
                Bridge.get(PolygonWarTutorial.App).heroCam = cameraComponent;
            }
        }
    });
    
    Bridge.define('PolygonWarTutorial.CollisionComponent', {
        inherits: [PolygonWarTutorial.Component],
        partitionRow: 0,
        partitionCol: 0,
        ignoreEntity: 0,
        constructor: function (ignoreEntity) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "collision");
    
            this.partitionRow = -1;
            this.partitionCol = -1;
            this.ignoreEntity = ignoreEntity;
        }
    });
    
    Bridge.define('PolygonWarTutorial.CollisionSystem', {
        inherits: [PolygonWarTutorial.System],
        statics: {
            PARTITION_SIZE: 100
        },
        partition: null,
        constructor: function () {
            PolygonWarTutorial.System.prototype.$constructor.call(this);
    
            this.addRequiredComponent("collision");
            this.addRequiredComponent("shape");
            this.addRequiredComponent("position");
    
            var numPartitions = 50;
            numPartitions++; //Because we always want to round up
    
            this.partition = Bridge.Array.create(null, null, numPartitions, numPartitions);
            for (var i = 0; i < numPartitions; i++) {
                for (var j = 0; j < numPartitions; j++) {
                    this.partition.set([i, j], new Bridge.List$1(Bridge.Int)());
                }
            }
        },
        deleteEntity: function (id) {
            PolygonWarTutorial.System.prototype.deleteEntity.call(this, id);
            for (var i = 0; i < Bridge.Array.getLength(this.partition, 0); i++) {
                for (var j = 0; j < Bridge.Array.getLength(this.partition, 1); j++) {
                    this.partition.get([i, j]).remove(id);
                }
            }
        },
        update: function (deltaTime) {
            var $t, $t1;
            var toRemove = new Bridge.List$1(Bridge.Int)();
            $t = Bridge.getEnumerator(this.registeredEntities.getValues());
            while ($t.moveNext()) {
                var entity = $t.getCurrent();
                var collisionComponent = Bridge.cast(entity.getComponent("collision"), PolygonWarTutorial.CollisionComponent);
                var shapeComponent = Bridge.cast(entity.getComponent("shape"), PolygonWarTutorial.ShapeComponent);
                var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
    
                if (!Bridge.get(PolygonWarTutorial.App).isInCamera(positionComponent)) {
                    continue;
                }
    
                if (this.updateEntityPartition(entity)) {
                    toRemove.add(entity.getId());
                }
                this.checkForCollisions(entity, toRemove);
            }
            $t1 = Bridge.getEnumerator(toRemove);
            while ($t1.moveNext()) {
                var id = $t1.getCurrent();
                this.manager.removeEntity(id);
            }
        },
        updateEntityPartition: function (entity) {
            var collisionComponent = Bridge.cast(entity.getComponent("collision"), PolygonWarTutorial.CollisionComponent);
            var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
    
            if (!this.inLevelBounds(positionComponent.position)) {
                return true;
            }
    
    
            var row = Bridge.Int.trunc((positionComponent.position.y / Bridge.get(PolygonWarTutorial.CollisionSystem).PARTITION_SIZE));
            var col = Bridge.Int.trunc((positionComponent.position.y / Bridge.get(PolygonWarTutorial.CollisionSystem).PARTITION_SIZE));
    
            if (collisionComponent.partitionRow !== row || collisionComponent.partitionCol !== col) {
                if (collisionComponent.partitionRow !== -1) {
                    this.partition.get([collisionComponent.partitionRow, collisionComponent.partitionCol]).remove(entity.getId());
                }
                this.partition.get([row, col]).add(entity.getId());
                collisionComponent.partitionRow = row;
                collisionComponent.partitionCol = col;
            }
    
            return false;
        },
        checkForCollisions: function (entity, toRemove) {
            var collisionComponent = Bridge.cast(entity.getComponent("collision"), PolygonWarTutorial.CollisionComponent);
    
            var row = collisionComponent.partitionRow;
            var col = collisionComponent.partitionCol;
    
            this.checkForCollisions$1(entity, row, col, toRemove);
        },
        checkForCollisions$1: function (entity, partitionRow, partitionCol, toRemove) {
            var $t;
            if (!this.inPartitionBounds(partitionRow, partitionCol)) {
                return;
            }
    
            var collisionComponent = Bridge.cast(entity.getComponent("collision"), PolygonWarTutorial.CollisionComponent);
    
            $t = Bridge.getEnumerator(this.partition.get([partitionRow, partitionCol]));
            while ($t.moveNext()) {
                var entityId = $t.getCurrent();
                if (entity.getId() === entityId) {
                    continue;
                }
    
                var other = this.manager.getEntityById(entityId);
                var otherCollision = Bridge.cast(entity.getComponent("collision"), PolygonWarTutorial.CollisionComponent);
    
                if (this.entitiesCollide(entity, other)) {
                    this.handleCollision(entity, other, toRemove);
                    this.handleCollision(other, entity, toRemove);
                }
            }
        },
        handleCollision: function (a, b, toRemove) {
            if (a.hasComponent("damage") && b.hasComponent("health")) {
                var damageComponent = Bridge.cast(a.getComponent("damage"), PolygonWarTutorial.DamageComponent);
                var healthComponent = Bridge.cast(b.getComponent("health"), PolygonWarTutorial.HealthComponent);
    
                if (damageComponent.gaveDamage) {
                    //To prevent damage from being dealt twice, before the projectile is removed
                    return;
                }
                damageComponent.gaveDamage = true;
                healthComponent.health -= damageComponent.damage;
    
                if (healthComponent.health <= 0) {
                    toRemove.add(b.getId());
                    Bridge.get(PolygonWarTutorial.App).kills++;
                }
                toRemove.add(a.getId());
            }
        },
        entitiesCollide: function (a, b) {
            var shapeA = Bridge.cast(a.getComponent("shape"), PolygonWarTutorial.ShapeComponent);
            var shapeB = Bridge.cast(b.getComponent("shape"), PolygonWarTutorial.ShapeComponent);
            var positionA = Bridge.cast(a.getComponent("position"), PolygonWarTutorial.PositionComponent);
            var positionB = Bridge.cast(b.getComponent("position"), PolygonWarTutorial.PositionComponent);
            var collisionA = Bridge.cast(a.getComponent("collision"), PolygonWarTutorial.CollisionComponent);
            var collisionB = Bridge.cast(b.getComponent("collision"), PolygonWarTutorial.CollisionComponent);
    
            var combinedRadius = shapeA.radius + shapeB.radius;
            var between = PolygonWarTutorial.Vector.op_Subtraction(positionA.position, positionB.position);
            var distance = between.length();
    
            if (collisionA.ignoreEntity === b.getId() || collisionB.ignoreEntity === a.getId()) {
                return false;
            }
    
            return distance < combinedRadius;
        },
        inPartitionBounds: function (row, col) {
            return row >= 0 && col >= 0 && row < Bridge.Array.getLength(this.partition, 0) && col < Bridge.Array.getLength(this.partition, 1);
        },
        inLevelBounds: function (position) {
            return position.x >= 0 && position.y >= 0 && position.x <= Bridge.get(PolygonWarTutorial.App).LEVEL_SIZE && position.y <= Bridge.get(PolygonWarTutorial.App).LEVEL_SIZE;
        }
    });
    
    Bridge.define('PolygonWarTutorial.DamageComponent', {
        inherits: [PolygonWarTutorial.Component],
        damage: 0,
        gaveDamage: false,
        constructor: function (damage) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "damage");
    
            this.damage = damage;
            this.gaveDamage = false;
        }
    });
    
    Bridge.define('PolygonWarTutorial.DirectionComponent', {
        inherits: [PolygonWarTutorial.Component],
        direction: null,
        constructor: function (direction) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "direction");
    
            this.direction = direction;
            this.direction.normalize();
        }
    });
    
    Bridge.define('PolygonWarTutorial.GarbageSystem', {
        inherits: [PolygonWarTutorial.System],
        constructor: function () {
            PolygonWarTutorial.System.prototype.$constructor.call(this);
    
            this.addRequiredComponent("lifetime");
        },
        update: function (deltaTime) {
            var $t, $t1;
            var toRemove = new Bridge.List$1(Bridge.Int)();
            $t = Bridge.getEnumerator(this.registeredEntities.getValues());
            while ($t.moveNext()) {
                var entity = $t.getCurrent();
                var lifetimeComponent = Bridge.cast(entity.getComponent("lifetime"), PolygonWarTutorial.LifetimeComponent);
    
                lifetimeComponent.currentTime += deltaTime;
                if (lifetimeComponent.currentTime >= lifetimeComponent.timeAlive) {
                    toRemove.add(entity.getId());
                }
            }
    
            $t1 = Bridge.getEnumerator(toRemove);
            while ($t1.moveNext()) {
                var id = $t1.getCurrent();
                this.manager.removeEntity(id);
            }
        }
    });
    
    Bridge.define('PolygonWarTutorial.HealthComponent', {
        inherits: [PolygonWarTutorial.Component],
        maxHealth: 0,
        health: 0,
        constructor: function (maxHealth) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "health");
    
            this.maxHealth = maxHealth;
            this.health = maxHealth;
        }
    });
    
    Bridge.define('PolygonWarTutorial.LifetimeComponent', {
        inherits: [PolygonWarTutorial.Component],
        timeAlive: 0,
        currentTime: 0,
        constructor: function (timeAlive) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "lifetime");
    
            this.timeAlive = timeAlive;
            this.currentTime = 0;
        }
    });
    
    Bridge.define('PolygonWarTutorial.MoveInDirection', {
        inherits: [PolygonWarTutorial.Action],
        velocity: null,
        deltaTime: 0,
        constructor: function (direction, dt) {
            PolygonWarTutorial.Action.prototype.$constructor.call(this);
    
            this.velocity = direction;
            this.velocity.normalize();
            this.deltaTime = dt;
        },
        doAction: function (entity) {
            var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
            var speedComponent = Bridge.cast(entity.getComponent("speed"), PolygonWarTutorial.SpeedComponent);
    
            this.velocity = PolygonWarTutorial.Vector.op_Multiply(this.velocity, speedComponent.speed * this.deltaTime);
    
            positionComponent.position = PolygonWarTutorial.Vector.op_Addition(positionComponent.position, this.velocity);
        }
    });
    
    Bridge.define('PolygonWarTutorial.MovementSystem', {
        inherits: [PolygonWarTutorial.System],
        constructor: function () {
            PolygonWarTutorial.System.prototype.$constructor.call(this);
    
            this.addRequiredComponent("direction");
            this.addRequiredComponent("speed");
            this.addRequiredComponent("position");
        },
        update: function (deltaTime) {
            var $t;
            $t = Bridge.getEnumerator(this.registeredEntities.getValues());
            while ($t.moveNext()) {
                var entity = $t.getCurrent();
                var directionComponent = Bridge.cast(entity.getComponent("direction"), PolygonWarTutorial.DirectionComponent);
                var speedComponent = Bridge.cast(entity.getComponent("speed"), PolygonWarTutorial.SpeedComponent);
                var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
    
                var velocity = PolygonWarTutorial.Vector.op_Multiply(PolygonWarTutorial.Vector.op_Multiply(directionComponent.direction, speedComponent.speed), deltaTime);
                positionComponent.position = PolygonWarTutorial.Vector.op_Addition(positionComponent.position, velocity);
            }
        }
    });
    
    Bridge.define('PolygonWarTutorial.PositionComponent', {
        inherits: [PolygonWarTutorial.Component],
        position: null,
        constructor: function (position) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "position");
    
            this.position = position;
        }
    });
    
    Bridge.define('PolygonWarTutorial.RenderSystem', {
        inherits: [PolygonWarTutorial.System],
        constructor: function () {
            PolygonWarTutorial.System.prototype.$constructor.call(this);
    
            this.addRequiredComponent("shape");
            this.addRequiredComponent("position");
        },
        update: function (deltaTime) {
            var $t;
            if (!Bridge.hasValue(Bridge.get(PolygonWarTutorial.App).heroCam)) {
                return;
            }
    
            $t = Bridge.getEnumerator(this.registeredEntities.getValues());
            while ($t.moveNext()) {
                var entity = $t.getCurrent();
                var shapeComponent = Bridge.cast(entity.getComponent("shape"), PolygonWarTutorial.ShapeComponent);
                var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
    
                if (!Bridge.get(PolygonWarTutorial.App).isInCamera(positionComponent)) {
                    continue;
                }
    
                Bridge.get(PolygonWarTutorial.App).context.translate(-Bridge.get(PolygonWarTutorial.App).heroCam.x1, -Bridge.get(PolygonWarTutorial.App).heroCam.y1);
    
                switch (shapeComponent.shapeType) {
                    case "circle": 
                        this.drawCircle(shapeComponent, positionComponent);
                        break;
                    case "triangle": 
                        var facingComponent = Bridge.cast(entity.getComponent("facing"), PolygonWarTutorial.FacingComponent);
                        this.drawTriangle(shapeComponent, positionComponent, facingComponent);
                        break;
                    case "square": 
                        this.drawSquare(shapeComponent, positionComponent);
                        break;
                }
    
                if (entity.hasComponent("health")) {
                    var healthComponent = Bridge.cast(entity.getComponent("health"), PolygonWarTutorial.HealthComponent);
                    var ratio = 1.0 * healthComponent.health / healthComponent.maxHealth;
    
                    var x1 = positionComponent.position.x - shapeComponent.radius;
                    var y1 = positionComponent.position.y - (shapeComponent.radius + 15);
                    var width = 2 * shapeComponent.radius;
                    var greenWidth = width * ratio;
                    var height = 10;
    
                    Bridge.get(PolygonWarTutorial.App).context.fillStyle = "grey";
                    Bridge.get(PolygonWarTutorial.App).context.fillRect(Bridge.Int.trunc(x1), Bridge.Int.trunc(y1), Bridge.Int.trunc(width), Bridge.Int.trunc(height));
                    Bridge.get(PolygonWarTutorial.App).context.fillStyle = "green";
                    Bridge.get(PolygonWarTutorial.App).context.fillRect(Bridge.Int.trunc(x1), Bridge.Int.trunc(y1), Bridge.Int.trunc(greenWidth), Bridge.Int.trunc(height));
                }
    
                Bridge.get(PolygonWarTutorial.App).context.translate(Bridge.get(PolygonWarTutorial.App).heroCam.x1, Bridge.get(PolygonWarTutorial.App).heroCam.y1);
            }
        },
        drawCircle: function (shapeComponent, positionComponent) {
            var ctx = Bridge.get(PolygonWarTutorial.App).context;
            var position = positionComponent.position;
    
            ctx.beginPath();
            ctx.arc(position.x, position.y, shapeComponent.radius, 0, 2 * Math.PI);
            ctx.fillStyle = shapeComponent.color;
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        },
        drawTriangle: function (shapeComponent, positionComponent, facingComponent) {
            var ctx = Bridge.get(PolygonWarTutorial.App).context;
            var position = positionComponent.position;
            var radius = shapeComponent.radius;
    
            var up = new PolygonWarTutorial.Vector(0, -1);
            var downLeft = new PolygonWarTutorial.Vector(1, 1);
            var downRight = new PolygonWarTutorial.Vector(-1, 1);
    
            up.rotate(facingComponent.getRotation());
            downLeft.rotate(facingComponent.getRotation());
            downRight.rotate(facingComponent.getRotation());
    
            downLeft.normalize();
            downRight.normalize();
            up = PolygonWarTutorial.Vector.op_Multiply(up, radius * (1 / Math.sqrt(2)));
            downLeft = PolygonWarTutorial.Vector.op_Multiply(downLeft, radius);
            downRight = PolygonWarTutorial.Vector.op_Multiply(downRight, radius);
            up = PolygonWarTutorial.Vector.op_Addition(up, position);
            downLeft = PolygonWarTutorial.Vector.op_Addition(downLeft, position);
            downRight = PolygonWarTutorial.Vector.op_Addition(downRight, position);
    
            ctx.beginPath();
            ctx.moveTo(up.x, up.y);
            ctx.lineTo(downLeft.x, downLeft.y);
            ctx.lineTo(downRight.x, downRight.y);
            ctx.lineTo(up.x, up.y);
    
            ctx.fillStyle = shapeComponent.color;
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        },
        drawSquare: function (shapeComponent, positionComponent) {
            var ctx = Bridge.get(PolygonWarTutorial.App).context;
            var position = positionComponent.position;
            var radius = shapeComponent.radius;
    
            var offsetPosition = PolygonWarTutorial.Vector.op_Subtraction(position, new PolygonWarTutorial.Vector(radius, radius));
    
            ctx.fillStyle = shapeComponent.color;
            ctx.fillRect(Bridge.Int.trunc(offsetPosition.x), Bridge.Int.trunc(offsetPosition.y), 2 * radius, 2 * radius);
            ctx.strokeRect(Bridge.Int.trunc(offsetPosition.x), Bridge.Int.trunc(offsetPosition.y), 2 * radius, 2 * radius);
        }
    });
    
    Bridge.define('PolygonWarTutorial.ShapeComponent', {
        inherits: [PolygonWarTutorial.Component],
        shapeType: null,
        radius: 0,
        color: null,
        hollow: false,
        constructor: function (shapeType, radius, color, hollow) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "shape");
    
            this.shapeType = shapeType;
            this.radius = radius;
            this.color = color;
            this.hollow = hollow;
        }
    });
    
    Bridge.define('PolygonWarTutorial.SpawnProjectile', {
        inherits: [PolygonWarTutorial.Action],
        target: null,
        manager: null,
        constructor: function (target, manager) {
            PolygonWarTutorial.Action.prototype.$constructor.call(this);
    
            this.target = target;
            this.manager = manager;
        },
        doAction: function (entity) {
            var positionComponent = Bridge.cast(entity.getComponent("position"), PolygonWarTutorial.PositionComponent);
    
            var actionComponent = Bridge.cast(entity.getComponent("action"), PolygonWarTutorial.ActionComponent);
            var speed = (actionComponent.fromInput) ? Bridge.get(PolygonWarTutorial.App).HERO_PROJECTILE_SPEED : Bridge.get(PolygonWarTutorial.App).ENEMY_PROJECTILE_SPEED;
            var direction = PolygonWarTutorial.Vector.op_Subtraction(this.target, positionComponent.position);
    
            var projectile = this.manager.addAndGetEntity();
            projectile.addProjectileAssemblage(this.manager, positionComponent.position.x, positionComponent.position.y, direction.x, direction.y, speed, entity.getId(), Bridge.get(PolygonWarTutorial.App).PROJECTILE_DAMAGE);
        }
    });
    
    Bridge.define('PolygonWarTutorial.SpeedComponent', {
        inherits: [PolygonWarTutorial.Component],
        speed: 0,
        constructor: function (speed) {
            PolygonWarTutorial.Component.prototype.$constructor.call(this, "speed");
    
            this.speed = speed;
        }
    });
    
    Bridge.define('PolygonWarTutorial.FacingComponent', {
        inherits: [PolygonWarTutorial.DirectionComponent],
        constructor: function (direction) {
            PolygonWarTutorial.DirectionComponent.prototype.$constructor.call(this, direction);
    
            this.setName("facing");
        },
        getRotation: function () {
            var up = new PolygonWarTutorial.Vector(0, -1);
            var result = Bridge.get(PolygonWarTutorial.Vector).angleBetween(up, this.direction);
            if (this.direction.x < 0) {
                result = 2 * Math.PI - result;
            }
    
            return result;
        }
    });
    
    Bridge.init();
})(this);
