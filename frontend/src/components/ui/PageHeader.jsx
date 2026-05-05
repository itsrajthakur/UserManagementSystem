export default function PageHeader({ title, subtitle, actions = null }) {
  return (
    <header className="ui-page-header">
      <div>
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle ? <p className="ui-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}
