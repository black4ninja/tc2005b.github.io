import Parse from 'parse/node';

export class BaseModel extends Parse.Object {
  constructor(className: string, attributes?: Parse.Attributes) {
    super(className, attributes);
  }

  /** Call after constructing a new object to set defaults before first save */
  initDefaults(): this {
    if (!this.has('active')) this.set('active', true);
    if (!this.has('exists')) this.set('exists', true);
    return this;
  }

  isActive(): boolean {
    return this.get('active') === true && this.get('exists') === true;
  }

  softDelete(): void {
    this.set('active', false);
    this.set('exists', false);
  }

  activate(): void {
    this.set('active', true);
  }

  deactivate(): void {
    this.set('active', false);
  }

  static queryActive<T extends Parse.Object>(className: string): Parse.Query<T> {
    const query = new Parse.Query<T>(className);
    query.equalTo('active' as any, true as any);
    query.equalTo('exists' as any, true as any);
    return query;
  }
}
