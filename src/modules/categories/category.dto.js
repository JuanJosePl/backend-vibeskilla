/**
 * @description DTOs para el módulo Category
 */

class CategoryListDTO {
  constructor(category) {
    this._id = category._id;
    this.name = category.name;
    this.slug = category.slug;
    this.description = category.description;
    this.images = {
      thumbnail: category.images?.thumbnail || null,
      icon: category.images?.icon || null
    };
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
  }
}

class CategoryDetailDTO {
  constructor(category, extras = {}) {
    // Datos base
    this._id = category._id;
    this.name = category.name;
    this.slug = category.slug;
    this.description = category.description;
    
    // Imágenes
    this.images = {
      thumbnail: category.images?.thumbnail || null,
      hero: category.images?.hero || null,
      icon: category.images?.icon || null
    };
    
    // SEO
    this.seo = {
      metaTitle: category.seo?.metaTitle || category.name,
      metaDescription: category.seo?.metaDescription || category.description,
      keywords: category.seo?.keywords || [],
      ogImage: category.seo?.ogImage || category.images?.hero || null,
      ogDescription: category.seo?.ogDescription || category.description
    };
    
    // Estadísticas
    this.stats = {
      views: category.views || 0,
      productCount: extras.productCount || category.productCount || 0
    };
    
    // Jerarquía
    this.breadcrumb = extras.breadcrumb || [];
    this.subcategories = extras.subcategories || [];
    this.parentCategory = category.parentCategory 
      ? {
          _id: category.parentCategory._id,
          name: category.parentCategory.name,
          slug: category.parentCategory.slug
        }
      : null;
    
    // Metadata
    this.featured = category.featured || false;
    this.createdAt = category.createdAt;
    this.updatedAt = category.updatedAt;
  }
}

class CategoryTreeNodeDTO {
  constructor(category, children = []) {
    this._id = category._id;
    this.name = category.name;
    this.slug = category.slug;
    this.images = {
      thumbnail: category.images?.thumbnail || null,
      icon: category.images?.icon || null
    };
    this.productCount = category.productCount || 0;
    this.order = category.order || 0;
    this.children = children.map(child => new CategoryTreeNodeDTO(child, child.children || []));
  }
}

module.exports = { 
  CategoryListDTO, 
  CategoryDetailDTO, 
  CategoryTreeNodeDTO 
};