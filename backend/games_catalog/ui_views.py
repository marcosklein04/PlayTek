from django.shortcuts import render

def catalogo_page(request):
    return render(request, "catalogo/index.html")