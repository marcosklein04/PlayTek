from django.shortcuts import render

# Create your views here.
from django.shortcuts import render

def hangman_runner_page(request):
    # La página lee session_id/user_id/session_token desde querystring con JS.
    # No validamos acá (se valida contra /api/runner/...).
    return render(request, "hangman/index.html")