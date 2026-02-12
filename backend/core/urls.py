from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from wallet import admin_views as wallet_admin_views
from wallet import views as wallet_views


urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),


    path("api/", include("api_auth.urls")),
    path("", include("wallet.urls")),
    path("api/", include("wallet.urls")),
    path("api/", include("games_catalog.api_urls")),


    path("runner/", include("games_catalog.runner_urls")),
    path("runner/", include("hangman.urls")),
    path("runner/", include("trivia.urls")),


    path("api/admin/credit-packs", wallet_admin_views.admin_credit_packs_list),
    path("api/admin/credit-packs/create", wallet_admin_views.admin_credit_packs_create),
    path("api/admin/credit-packs/<int:pack_id>", wallet_admin_views.admin_credit_packs_detail),

    # admin credit packs
    path("api/admin/credit-packs", wallet_views.admin_credit_packs),
    path("api/admin/credit-packs/<int:pack_id>", wallet_views.admin_credit_packs_update),

    
    path("", include("games_catalog.ui_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
