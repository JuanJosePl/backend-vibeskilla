/**
 * @description DTOs para el módulo Category optimizados para frontend
 */

/**
 * ✅ MEJORADO - CategoryListDTO con productCount garantizado
 */
class CategoryListDTO {
  constructor(category) {
    this._id = category._id;
    this.name = category.name;
    this.slug = category.slug;
    this.description = category.description || "";
    this.images = {
      thumbnail: category.images?.thumbnail || null,
      icon: category.images?.icon || null
    };
    // ✅ CRÍTICO: productCount SIEMPRE presente
    this.productCount = category.productCount || 0;
    this.featured = category.featured || false;
    this.order = category.order || 0;
    this.parentCategory = category.parentCategory 
      ? {
          _id: category.parentCategory._id,
          name: category.parentCategory.name,
          slug: category.parentCategory.slug
        }
      : null;
    
    // ✅ NUEVO - UI helpers
    this.hasProducts = (category.productCount || 0) > 0;
    this.url = `/categories/${category.slug}`;
  }
}

/**
 * ✅ MEJORADO - CategoryDetailDTO con SEO completo y contexto
 */
class CategoryDetailDTO {
  constructor(category, extras = {}) {
    // Datos base
    this._id = category._id;
    this.name = category.name;
    this.slug = category.slug;
    this.description = category.description || "";
    
    // Imágenes
    this.images = {
      thumbnail: category.images?.thumbnail || null,
      hero: category.images?.hero || null,
      icon: category.images?.icon || null
    };
    
    // ✅ MEJORADO - SEO con defaults inteligentes
    this.seo = {
      metaTitle: category.seo?.metaTitle || category.name,
      metaDescription: category.seo?.metaDescription || category.description || `Productos de ${category.name}`,
      keywords: category.seo?.keywords || [],
      ogImage: category.seo?.ogImage || category.images?.hero || category.images?.thumbnail || null,
      ogDescription: category.seo?.ogDescription || category.description || `Explora nuestra categoría de ${category.name}`,
      canonicalUrl: `/categories/${category.slug}`
    };
    
    // ✅ CRÍTICO - Estadísticas con productCount garantizado
    this.stats = {
      views: category.views || 0,
      productCount: extras.productCount !== undefined ? extras.productCount : (category.productCount || 0)
    };
    
    // Jerarquía
    this.breadcrumb = extras.breadcrumb || [];
    this.subcategories = extras.subcategories || [];
    this.parentCategory = category.parentCategory 
      ? {
          _id: category.parentCategory._id,
          name: category.parentCategory.name,
          slug: category.parentCategory.slug,
          url: `/categories/${category.parentCategory.slug}`
        }
      : null;
    
    // Metadata
    this.featured = category.featured || false;
    this.createdAt = category.createdAt;
    this.updatedAt = category.updatedAt;
    
    // ✅ NUEVO - UI helpers
    this.hasProducts = (this.stats.productCount || 0) > 0;
    this.hasSubcategories = (this.subcategories?.length || 0) > 0;
    this.url = `/categories/${category.slug}`;
    
    // ✅ NUEVO - SEO Context si está disponible
    if (extras.seoContext) {
      this.seoContext = extras.seoContext;
    }
  }
}

/**
 * ✅ MEJORADO - CategoryTreeNodeDTO con productCount
 */
class CategoryTreeNodeDTO {
  constructor(category, children = []) {
    this._id = category._id;
    this.name = category.name;
    this.slug = category.slug;
    this.images = {
      thumbnail: category.images?.thumbnail || null,
      icon: category.images?.icon || null
    };
    // ✅ CRÍTICO: productCount SIEMPRE presente
    this.productCount = category.productCount || 0;
    this.order = category.order || 0;
    this.children = children.map(child => new CategoryTreeNodeDTO(child, child.children || []));
    
    // ✅ NUEVO - UI helpers
    this.hasChildren = (this.children?.length || 0) > 0;
    this.hasProducts = (category.productCount || 0) > 0;
    this.url = `/categories/${category.slug}`;
    
    // ✅ NUEVO - Total de productos incluyendo subcategorías
    this.totalProducts = this.productCount + this.children.reduce((sum, child) => sum + (child.totalProducts || 0), 0);
  }
}

/**
 * ✅ NUEVO - CategoryCardDTO para grids/cards en frontend
 */
class CategoryCardDTO {
  constructor(category) {
    this._id = category._id;
    this.name = category.name;
    this.slug = category.slug;
    this.description = category.description || "";
    this.image = category.images?.thumbnail || category.images?.hero || null;
    this.icon = category.images?.icon || null;
    this.productCount = category.productCount || 0;
    this.featured = category.featured || false;
    this.url = `/categories/${category.slug}`;
    
    // UI helpers
    this.hasProducts = (category.productCount || 0) > 0;
    this.displayText = category.productCount === 1 
      ? `${category.productCount} producto` 
      : `${category.productCount} productos`;
  }
}

/**
 * ✅ NUEVO - CategorySEODTO para contexto SEO reutilizable
 */
class CategorySEODTO {
  constructor(seoContext) {
    this.title = seoContext.title;
    this.description = seoContext.description;
    this.keywords = seoContext.keywords || [];
    this.ogTitle = seoContext.ogTitle;
    this.ogDescription = seoContext.ogDescription;
    this.ogImage = seoContext.ogImage;
    this.canonicalUrl = seoContext.canonicalUrl;
    this.breadcrumb = seoContext.breadcrumb || [];
    
    // ✅ Meta tags listos para usar
    this.metaTags = {
      title: this.title,
      description: this.description,
      keywords: this.keywords.join(", "),
      "og:title": this.ogTitle,
      "og:description": this.ogDescription,
      "og:image": this.ogImage,
      "og:url": this.canonicalUrl,
      canonical: this.canonicalUrl
    };
  }
}

module.exports = { 
  CategoryListDTO, 
  CategoryDetailDTO, 
  CategoryTreeNodeDTO,
  CategoryCardDTO,
  CategorySEODTO
};