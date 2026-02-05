import uuid
from django.conf import settings
from django.db import models



# ============================================================
# MODELOS REALES (INGLÉS) → son los que “mandan” en DB y migraciones
# ============================================================
class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "games_catalog_tag"
        verbose_name = "Tag"
        verbose_name_plural = "Tags"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Game(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    cover_image_url = models.URLField(blank=True)
    runner_url = models.CharField(max_length=255, blank=True, default="") 
    price_label = models.CharField(max_length=40, blank=True)
    cost_per_play = models.PositiveIntegerField(default=1)

    is_featured = models.BooleanField(default=False)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Tabla M2M real existente: games_catalog_game_tags (game_id, tag_id)
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name="games",
        db_table="games_catalog_game_tags",
    )

    class Meta:
        db_table = "games_catalog_game"
        verbose_name = "Juego"
        verbose_name_plural = "Catálogo de Juegos"
        ordering = ["-is_featured", "name"]

    def __str__(self) -> str:
        return self.slug


class GameSession(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        FINISHED = "finished", "Finished"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_sessions",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="sessions",
    )

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    cost_charged = models.PositiveIntegerField(default=0)
    client_state = models.JSONField(default=dict, blank=True)
    result = models.JSONField(default=dict, blank=True)

    # alineado a la migración 0008
    runner_token = models.CharField(max_length=64, blank=True, default="", db_index=True)
    
    class Meta:
        db_table = "games_catalog_gamesession"
        verbose_name = "Sesión de juego"
        verbose_name_plural = "Sesiones de juego"
        ordering = ["-started_at"]

    def __str__(self) -> str:
        username = getattr(self.user, "username", str(self.user))
        return f"{username} - {self.game.slug} - {self.status}"

# ============================================================
# PROXIES (ESPAÑOL) → NO crean tablas, NO generan migraciones
# ============================================================
class Etiqueta(Tag):
    class Meta:
        proxy = True
        verbose_name = "Etiqueta"
        verbose_name_plural = "Etiquetas"
        ordering = ["name"]

    @property
    def nombre(self):
        return self.name

    @nombre.setter
    def nombre(self, value):
        self.name = value


class Juego(Game):
    class Meta:
        proxy = True
        verbose_name = "Juego"
        verbose_name_plural = "Catálogo de Juegos"
        ordering = ["-is_featured", "name"]

    @property
    def nombre(self):
        return self.name

    @nombre.setter
    def nombre(self, value):
        self.name = value

    @property
    def descripcion(self):
        return self.description

    @descripcion.setter
    def descripcion(self, value):
        self.description = value

    @property
    def imagen_portada_url(self):
        return self.cover_image_url

    @imagen_portada_url.setter
    def imagen_portada_url(self, value):
        self.cover_image_url = value

    @property
    def etiqueta_precio(self):
        return self.price_label

    @etiqueta_precio.setter
    def etiqueta_precio(self, value):
        self.price_label = value

    @property
    def costo_por_partida(self):
        return self.cost_per_play

    @costo_por_partida.setter
    def costo_por_partida(self, value):
        self.cost_per_play = value

    @property
    def destacado(self):
        return self.is_featured

    @destacado.setter
    def destacado(self, value):
        self.is_featured = value

    @property
    def habilitado(self):
        return self.is_enabled

    @habilitado.setter
    def habilitado(self, value):
        self.is_enabled = value

    @property
    def etiquetas(self):
        # “etiquetas” en español → realmente es tags
        return self.tags


class SesionJuego(GameSession):
    class Meta:
        proxy = True
        verbose_name = "Sesión de juego"
        verbose_name_plural = "Sesiones de juego"
        ordering = ["-started_at"]

    class Estado(models.TextChoices):
        ACTIVA = "active", "Activa"
        FINALIZADA = "finished", "Finalizada"
        ERROR = "error", "Error"

    @property
    def usuario(self):
        return self.user

    @property
    def juego(self):
        return self.game

    @property
    def iniciado_en(self):
        return self.started_at

    @property
    def finalizado_en(self):
        return self.ended_at

    @property
    def estado(self):
        return self.status

    @estado.setter
    def estado(self, value):
        self.status = value

    @property
    def costo_cobrado(self):
        return self.cost_charged

    @costo_cobrado.setter
    def costo_cobrado(self, value):
        self.cost_charged = value

    @property
    def estado_cliente(self):
        return self.client_state

    @estado_cliente.setter
    def estado_cliente(self, value):
        self.client_state = value